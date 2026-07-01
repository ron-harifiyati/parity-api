const express = require('express');
const { Member, User, Transaction } = require('../models/Relationships');
const auth = require('../middleware/authMiddleware');
const clubAuth = require('../middleware/clubMiddleware');
const treasurerAuth = require('../middleware/treasurerMiddleware');
const router = express.Router();
const { Op } = require('sequelize');

router.use(auth);
router.use(clubAuth)

// Get all members in a club
router.get('/', async (req, res) => {
    try {
        const members = await Member.findAll({
            where: {
                clubId: req.club.id
            }
        });
        res.json(members)
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: err.message })
    }
});

// Get a specific member's information
router.get('/:id', async (req, res) => {
    try {
        const member = await Member.findOne({
            where: {
                [Op.and]: [
                    { clubId: req.club.id },
                    { id: req.params.id }
                ]
            }
        });

        if (!member) {
            return res.status(404).json({ message: 'Member not found' })
        };

        res.json(member)
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: err.message })
    }
});

// Add a member to a club
router.post('/', async (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(404).json({ message: 'Username is required' })
    }

    if (req.user.id !== req.club.userId) {
        return res.status(401).json({ message: 'You cannot add members to this club' })
    }

    try {
        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        };

        const member = await Member.create({
            userId: user.id,
            username: user.username,
            email: user.email,
            clubId: req.club.id,
            isTreasurer: false
        });
        res.status(200).json({ message: "Member added successfully" })
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message })
    }
});

// Edit a member's information (record transaction)
router.patch('/:id', treasurerAuth, async (req, res) => {
    const { investAmount, interestAmount, payLoanAmount, loanAmount, period } = req.body;
    const noValues = (!investAmount && !interestAmount && !payLoanAmount && !loanAmount);
    const valuesAtZero = (investAmount < 1 && interestAmount < 1 && payLoanAmount < 1 && loanAmount < 1);

    if (noValues) {
        return res.status(400).json({ message: 'At least one amount must be greater than zero' })
    }

    if (!period) {
        return res.status(400).json({ message: 'Period (MM-YYYY) is required' })
    }

    try {
        const member = await Member.findByPk(req.params.id);
        if (!member) {
            return res.status(404).json({ message: 'Member not found' })
        };

        if (investAmount > 0) {
            await member.invest(investAmount)
        };
        if (interestAmount > 0) {
            await member.payInterest(interestAmount)
        };
        if (payLoanAmount > 0) {
            await member.payLoan(payLoanAmount)
        };
        if (loanAmount > 0) {
            await member.loan(loanAmount)
        };

        await Transaction.create({
            memberId: member.id,
            clubId: req.club.id,
            investAmount: investAmount || 0,
            interestAmount: interestAmount || 0,
            payLoanAmount: payLoanAmount || 0,
            loanAmount: loanAmount || 0,
            period: period
        });

        res.status(200).json({ message: 'Transaction complete' })
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message })
    }
});

// Delete a member from a club
router.delete('/:id', async (req, res) => {
    if (req.user.id !== req.club.userId) {
        return res.status(401).json({ message: 'You cannot add members to this club' })
    }

    try {
        const member = await Member.findByPk(req.params.id);
        if (!member) {
            res.status(404).json({ message: 'Member not found' })
        };

        const transactions = await Transaction.findAll({ where: { memberId: req.params.id } });

        await member.destroy();
        res.json({ message: 'Member deleted successfully' })

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message })
    }
});

// Set treasurer role for a member (owner only)
router.patch('/:id/treasurer', async (req, res) => {
    if (req.user.id !== req.club.userId) {
        return res.status(403).json({ message: 'Only club owner can assign treasurer role' })
    }

    try {
        const member = await Member.findByPk(req.params.id);
        if (!member) {
            return res.status(404).json({ message: 'Member not found' })
        }

        // Toggle treasurer status
        member.isTreasurer = !member.isTreasurer;
        await member.save();

        res.json({
            message: `Member ${member.isTreasurer ? 'promoted to' : 'removed from'} treasurer`,
            isTreasurer: member.isTreasurer
        })
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message })
    }
});

// Withdraw a member from the club (owner only)
router.post('/:id/withdraw', async (req, res) => {
    if (req.user.id !== req.club.userId) {
        return res.status(403).json({ message: 'Only club owner can withdraw members' })
    }

    try {
        const member = await Member.findByPk(req.params.id);
        if (!member) {
            return res.status(404).json({ message: 'Member not found' })
        }

        // Check member belongs to this club
        if (member.clubId !== req.club.id) {
            return res.status(400).json({ message: 'Member does not belong to this club' })
        }

        // Check member is not already withdrawn
        if (member.withdrawnAt) {
            return res.status(400).json({ message: 'Member has already withdrawn' })
        }

        // Check if member is club owner - must transfer ownership first
        if (member.userId === req.club.userId) {
            return res.status(400).json({ message: 'Owner must transfer ownership before withdrawing' })
        }

        // Get club to access penalty
        const club = await Club.findByPk(req.club.id);
        if (!club) {
            return res.status(404).json({ message: 'Club not found' })
        }

        // Calculate refund: totalInvestment - penalty
        const penalty = club.earlyWithdrawalPenalty || 10;
        const refundAmount = member.totalInvestment - penalty;

        // Mark member as withdrawn
        member.withdrawnAt = new Date();
        await member.save();

        // Record withdrawal transaction
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();
        const period = `${String(currentMonth).padStart(2, '0')}-${currentYear}`;

        await Transaction.create({
            memberId: member.id,
            clubId: req.club.id,
            withdrawalAmount: refundAmount,
            investAmount: 0,
            interestAmount: 0,
            payLoanAmount: 0,
            loanAmount: 0,
            period: period
        });

        res.json({
            message: 'Member withdrawn successfully',
            memberId: member.id,
            username: member.username,
            totalInvestment: member.totalInvestment,
            penalty: penalty,
            refundAmount: refundAmount,
            withdrawnAt: member.withdrawnAt
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message })
    }
});

module.exports = router