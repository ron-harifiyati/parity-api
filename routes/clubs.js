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
    const { title, monthlyContribution, startDate, paymentDay, autoLoanOnMissedPayment, gracePeriodDays, durationMonths, interestRate, earlyWithdrawalPenalty } = req.body;
    if (!title) {
        return res.status(400).json({ error: 'Title is required' })
    }

    // Calculate lending limit: monthlyContribution * durationMonths
    const finalMonthlyContribution = monthlyContribution || 25;
    const finalDurationMonths = durationMonths || 12;
    const lendingLimit = finalMonthlyContribution * finalDurationMonths;

    try {
        const club = await Club.create({
            userId: req.user.id,
            title,
            monthlyContribution: finalMonthlyContribution,
            startDate: startDate || null,
            paymentDay: paymentDay || 30,
            autoLoanOnMissedPayment: autoLoanOnMissedPayment !== undefined ? autoLoanOnMissedPayment : true,
            gracePeriodDays: gracePeriodDays || 1,
            durationMonths: finalDurationMonths,
            lendingLimit: lendingLimit,
            interestRate: interestRate || 10,
            earlyWithdrawalPenalty: earlyWithdrawalPenalty || 10
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
    const { title, monthlyContribution, startDate, paymentDay, autoLoanOnMissedPayment, gracePeriodDays, durationMonths, interestRate, earlyWithdrawalPenalty } = req.body;
    
    // At least one field must be provided
    if (!title && monthlyContribution === undefined && startDate === undefined && 
        paymentDay === undefined && autoLoanOnMissedPayment === undefined && 
        gracePeriodDays === undefined && durationMonths === undefined && interestRate === undefined && earlyWithdrawalPenalty === undefined) {
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
            // Recalculate lending limit if duration also changed or if it's the first time
            if (durationMonths !== undefined) {
                club.durationMonths = durationMonths;
            }
            club.lendingLimit = club.monthlyContribution * club.durationMonths;
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
        
        if (earlyWithdrawalPenalty !== undefined) {
            if (earlyWithdrawalPenalty < 0) {
                return res.status(400).json({ error: 'Withdrawal penalty must be at least 0' });
            }
            club.earlyWithdrawalPenalty = earlyWithdrawalPenalty;
        }
        
        if (durationMonths !== undefined && monthlyContribution === undefined) {
            if (durationMonths <= 0) {
                return res.status(400).json({ error: 'Duration must be greater than 0' });
            }
            club.durationMonths = durationMonths;
            club.lendingLimit = club.monthlyContribution * club.durationMonths;
        }
        
        if (interestRate !== undefined) {
            if (interestRate <= 0) {
                return res.status(400).json({ error: 'Interest rate must be greater than 0' });
            }
            club.interestRate = interestRate;
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

// Accrue monthly interest for all members with outstanding loans
router.post('/:id/accrue-interest', clubAuth, treasurerAuth, async (req, res) => {
    try {
        const club = await Club.findByPk(req.params.id);
        if (!club) {
            return res.status(404).json({ error: 'Club not found' });
        }

        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth(); // 0-11
        const currentPeriod = `${String(currentMonth + 1).padStart(2, '0')}-${currentYear}`; // MM-YYYY

        // Get all members in the club
        const members = await Member.findAll({ where: { clubId: club.id } });

        const accruedInterest = [];

        for (const member of members) {
            // Only accrue for members with outstanding principal
            if (member.owing <= 0) continue;

            // Check if we've already accrued for this period
            if (member.lastInterestAccrualDate) {
                const lastYear = member.lastInterestAccrualDate.getFullYear();
                const lastMonth = member.lastInterestAccrualDate.getMonth();
                const lastPeriod = `${String(lastMonth + 1).padStart(2, '0')}-${lastYear}`;
                
                if (lastPeriod === currentPeriod) {
                    // Already accrued for this period
                    continue;
                }
            }

            // Calculate interest: 10% of current principal, rounded UP
            // Special case: if principal < 10, interest = 1 (flat)
            const interestRateDecimal = club.interestRate / 100;
            let interest;
            if (member.owing < 10) {
                interest = 1; // Flat $1 for loans under $10
            } else {
                interest = Math.ceil(member.owing * interestRateDecimal);
            }

            // Update member
            member.interestOwing += interest;
            member.totalOwing += interest;
            member.lastInterestAccrualDate = today;
            await member.save();

            // Record transaction
            await Transaction.create({
                memberId: member.id,
                clubId: club.id,
                interestAmount: interest,
                investAmount: 0,
                payLoanAmount: 0,
                loanAmount: 0,
                period: currentPeriod
            });

            accruedInterest.push({
                memberId: member.id,
                username: member.username,
                principal: member.owing,
                interest: interest
            });
        }

        res.json({
            message: 'Interest accrued successfully',
            period: currentPeriod,
            clubId: club.id,
            totalInterestAccrued: accruedInterest.reduce((sum, i) => sum + i.interest, 0),
            members: accruedInterest
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
})

// Transfer club ownership to another member (owner only)
router.patch('/:id/transfer-ownership', auth, clubAuth, async (req, res) => {
    const { newOwnerUserId } = req.body;
    
    if (!newOwnerUserId) {
        return res.status(400).json({ error: 'newOwnerUserId is required' });
    }
    
    // Only current owner can transfer
    if (req.user.id !== req.club.userId) {
        return res.status(403).json({ error: 'Only current owner can transfer ownership' });
    }
    
    // Cannot transfer to self
    if (req.user.id === newOwnerUserId) {
        return res.status(400).json({ error: 'Cannot transfer ownership to yourself' });
    }
    
    try {
        // Verify new owner is a member of this club and not withdrawn
        const newOwner = await Member.findOne({
            where: {
                userId: newOwnerUserId,
                clubId: req.club.id,
                withdrawnAt: null
            }
        });
        
        if (!newOwner) {
            return res.status(400).json({ error: 'New owner must be an active member of this club' });
        }
        
        // Find current owner's member record
        const currentOwner = await Member.findOne({
            where: {
                userId: req.user.id,
                clubId: req.club.id
            }
        });
        
        // Transfer ownership
        req.club.userId = newOwnerUserId;
        await req.club.save();
        
        // Transfer treasurer status: new owner gets it, old owner loses it
        if (currentOwner) {
            currentOwner.isTreasurer = false;
            await currentOwner.save();
        }
        
        newOwner.isTreasurer = true;
        await newOwner.save();
        
        res.json({
            message: 'Club ownership transferred successfully',
            clubId: req.club.id,
            newOwnerUserId: newOwner.userId,
            newOwnerUsername: newOwner.username
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
})

module.exports = router