const { Op } = require('sequelize');
const express = require('express');
const { Member, Club, Transaction } = require('../models/Relationships');
const auth = require('../middleware/authMiddleware');
const clubAuth = require('../middleware/clubMiddleware');
const treasurerAuth = require('../middleware/treasurerMiddleware');
const router = express.Router();

router.use(auth);

// Get all clubs
router.get('/', async (req, res) => {
    try {
        const memberships = await Member.findAll({
            where: { userId: req.user.id },
            attributes: ['clubId']
        });

        const clubIds = memberships.map(m => m.clubId)

        const clubs = await Club.findAll({
            where: {
                [Op.or]: [
                    { userId: req.user.id },
                    { id: clubIds }
                ]
            },
            include: [
                {
                    model: Member,
                    as: 'members',
                    required: false
                }
            ]
        });

        const enriched = clubs.map(club => {
            const members = club.members || [];
            const totalInvestment = members.reduce((sum, m) => sum + m.investment, 0);
            const totalInterest = members.reduce((sum, m) => sum + m.interestAcrued, 0);
            const owed = members.reduce((sum, m) => sum + m.owing, 0);
            const totalOwed = members.reduce((sum, m) => sum + m.totalOwing, 0);

            return {
                ...club.toJSON(),
                totalMembers: members.length,
                totalInvestment,
                totalInterest,
                owed,
                totalOwed,
                inHand: totalInvestment + totalInterest - owed
            };
        });

        res.json(enriched);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message })
    }
});

// Get one club
router.get('/:id', async (req, res) => {
    try {
        // 1. You must "include" the members to access them later
        const club = await Club.findByPk(req.params.id, {
            include: ['members'] // Ensure 'members' matches your association alias
        });

        if (!club) {
            return res.status(404).json({ message: 'Club not found' });
        }

        // 2. Process the single object (no .map needed)
        const members = club.members || [];

        // Single-pass reduction for better performance
        const totals = members.reduce((acc, m) => {
            acc.investment += (m.investment || 0);
            acc.interest += (m.interestAcrued || 0);
            acc.owing += (m.owing || 0);
            acc.totalOwing += (m.totalOwing || 0);
            return acc;
        }, { investment: 0, interest: 0, owing: 0, totalOwing: 0 });

        const enriched = {
            ...club.toJSON(),
            totalMembers: members.length,
            totalInvestment: totals.investment,
            totalInterest: totals.interest,
            owed: totals.owing,
            totalOwed: totals.totalOwing,
            inHand: totals.investment + totals.interest - totals.owing
        };

        res.json(enriched);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Create a new club
router.post('/', async (req, res) => {
    const { title, monthlyContribution, startDate, paymentDay, autoLoanOnMissedPayment, gracePeriodDays } = req.body;
    if (!title) {
        return res.status(400).json({ error: 'Title is required' })
    }

    try {
        const club = await Club.create({
            userId: req.user.id,
            title,
            monthlyContribution: monthlyContribution || 25,
            startDate: startDate || null,
            paymentDay: paymentDay || 30,
            autoLoanOnMissedPayment: autoLoanOnMissedPayment !== undefined ? autoLoanOnMissedPayment : true,
            gracePeriodDays: gracePeriodDays || 1
        });

        // Automatically add club creator as a member with treasurer role
        await Member.create({
            userId: req.user.id,
            username: req.user.username,
            email: req.user.email,
            clubId: club.id,
            isTreasurer: true
        });

        res.status(201).json({ message: 'Club created successfully' })
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message })
    }
});

// Edit a club
router.patch('/:id', async (req, res) => {
    const { title, monthlyContribution, startDate, paymentDay, autoLoanOnMissedPayment, gracePeriodDays } = req.body;
    
    // At least one field must be provided
    if (!title && monthlyContribution === undefined && startDate === undefined && 
        paymentDay === undefined && autoLoanOnMissedPayment === undefined && gracePeriodDays === undefined) {
        return res.status(400).json({ error: 'At least one field must be provided' })
    }

    try {
        const club = await Club.findByPk(req.params.id);
        if (!club) {
            return res.json({ message: 'Club not found' })
        };

        if (club.userId !== req.user.id) {
            return res.json({ message: 'Not authorized to change club settings' })
        }

        // Validate fields
        if (monthlyContribution !== undefined) {
            if (monthlyContribution <= 0) {
                return res.status(400).json({ error: 'Monthly contribution must be greater than 0' });
            }
            club.monthlyContribution = monthlyContribution;
        }
        
        if (startDate !== undefined) {
            club.startDate = startDate;
        }
        
        if (paymentDay !== undefined) {
            if (paymentDay < 1 || paymentDay > 31) {
                return res.status(400).json({ error: 'Payment day must be between 1 and 31' });
            }
            club.paymentDay = paymentDay;
        }
        
        if (autoLoanOnMissedPayment !== undefined) {
            club.autoLoanOnMissedPayment = autoLoanOnMissedPayment;
        }
        
        if (gracePeriodDays !== undefined) {
            if (gracePeriodDays < 0) {
                return res.status(400).json({ error: 'Grace period days must be at least 0' });
            }
            club.gracePeriodDays = gracePeriodDays;
        }

        if (title !== undefined) {
            club.title = title;
        }

        await club.save();
        res.status(200).json({ message: 'Club updated successfully' })
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message })
    }
});

// Delete a club
router.delete('/:id', async (req, res) => {
    const club = await Club.findByPk(req.params.id);
    if (!club) {
        return res.status(404).json({ message: 'Club not found' })
    };

    try {
        if (club.userId !== req.user.id) {
            return res.json({ message: 'Not authorized to delete' })
        }

        const members = await Member.findAll({
            where: {
                clubId: req.params.id
            }
        });
        if (members) {
            for (const member of members) {
                await member.destroy()
            }
        };

        await club.destroy();
        res.status(200).json({ message: 'Deleted club successfully' })
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message })
    }
})

// Check and apply missed payments (treasurer or owner only)
router.post('/:id/check-missed-payments', clubAuth, treasurerAuth, async (req, res) => {
    try {
        const club = await Club.findByPk(req.params.id);
        if (!club) {
            return res.status(404).json({ error: 'Club not found' });
        }

        // Calculate previous month period (MM-YYYY format)
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth(); // 0-11
        
        let periodYear = currentYear;
        let periodMonth = currentMonth - 1; // Previous month
        
        if (periodMonth < 0) {
            periodMonth = 11;
            periodYear--;
        }
        
        const period = `${String(periodMonth + 1).padStart(2, '0')}-${periodYear}`; // MM-YYYY
        
        // Calculate due date and grace period end
        const dueDate = new Date(periodYear, periodMonth + 1, club.paymentDay);
        const gracePeriodEnd = new Date(dueDate);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + club.gracePeriodDays);
        
        // If today is before or on grace period end, can't check yet
        if (today <= gracePeriodEnd) {
            return res.json({
                message: 'Grace period still active for this period',
                period,
                dueDate: dueDate.toISOString().split('T')[0],
                gracePeriodEnd: gracePeriodEnd.toISOString().split('T')[0]
            });
        }

        // Find all members in club
        const members = await Member.findAll({ where: { clubId: club.id } });
        
        const missedMembers = [];
        const loanedMembers = [];
        
        for (const member of members) {
            // Check if member has a transaction for this period
            const transaction = await Transaction.findOne({
                where: {
                    memberId: member.id,
                    clubId: club.id,
                    period: period
                }
            });
            
            if (!transaction) {
                missedMembers.push(member);
                
                // Auto-loan if enabled
                if (club.autoLoanOnMissedPayment) {
                    await member.loan(club.monthlyContribution);
                    
                    await Transaction.create({
                        memberId: member.id,
                        clubId: club.id,
                        loanAmount: club.monthlyContribution,
                        investAmount: 0,
                        interestAmount: 0,
                        payLoanAmount: 0,
                        period: period
                    });
                    
                    loanedMembers.push(member);
                }
            }
        }

        res.json({
            message: 'Missed payments check complete',
            period,
            totalMembers: members.length,
            missedCount: missedMembers.length,
            loanedCount: loanedMembers.length,
            loanedMembers: loanedMembers.map(m => ({
                id: m.id,
                username: m.username,
                amount: club.monthlyContribution
            }))
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
})

module.exports = router