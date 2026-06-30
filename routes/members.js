const express = require('express');
const { Member, User, Transaction } = require('../models/Relationships');
const auth = require('../middleware/authMiddleware');
const clubAuth = require('../middleware/clubMiddleware');
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
            username: username
        });
        res.status(200).json({ message: "Member added successfully" })
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message })
    }
});

// Edit a member's information
router.patch('/:id', async (req, res) => {
    const { investAmount, interestAmount, payLoanAmount, loanAmount } = req.body;
    const noValues = (!investAmount && !interestAmount && !payLoanAmount && !loanAmount);
    const valuesAtZero = (investAmount < 1 && interestAmount < 1 && payLoanAmount < 1 && loanAmount < 1);

    if (noValues) {
        return res.status(404).json({ message: 'At least one amount must be greater than zero' })
    }

    if (req.user.id !== req.club.userId) {
        return res.status(401).json({ message: 'You cannot record transactions in this club' })
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
            investAmount,
            interestAmount,
            payLoanAmount,
            loanAmount
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

module.exports = router