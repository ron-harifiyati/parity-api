const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Member = sequelize.define('Member', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
        allowNull: false,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false
    },
     email: {
        type: DataTypes.STRING,
        allowNull: false
    },
    clubId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    isTreasurer: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    lastInterestAccrualDate: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
    },
    withdrawnAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
    },
    directInterestPayment: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },

    investment: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    interestAcrued: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    totalInvestment: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },

    owing: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    interestOwing: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    totalOwing: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
});

Member.prototype.invest = async function (amount) {
    this.investment += amount;
    this.totalInvestment += amount;
    await this.save()
};

Member.prototype.payInterest = async function (amount) {
    if (amount <= 0) {
        throw new Error('Amount must be greater than zero');
    };
    
    if ( amount < this.interestOwing ) {
        this.interestOwing -= amount;
        this.totalOwing -= amount
    } else {
        this.totalOwing -= this.interestOwing;
        this.interestOwing = 0
    };

    this.interestAcrued += amount;
    this.totalInvestment += amount;
    await this.save()
};

Member.prototype.payLoan = async function (amount) {
    this.owing -= amount;
    this.totalOwing -= amount
    await this.save()
};

Member.prototype.loan = async function (amount) {
    const club = await Club.findByPk(this.clubId);
    
    // Check lending limit
    if (club) {
        // Calculate active members (excluding withdrawn)
        const activeMembers = await this.constructor.findAll({
            where: {
                clubId: this.clubId,
                withdrawnAt: null
            }
        });
        
        // Recalculate lending limit based on active members
        // Limit per member = (monthlyContribution * durationMonths * activeMembers.length) / activeMembers.length
        // Which simplifies to: monthlyContribution * durationMonths
        // But we need to check if the total pool can cover all potential loans
        const maxTotalLoans = club.lendingLimit * activeMembers.length;
        const currentTotalOwing = activeMembers.reduce((sum, m) => sum + m.totalOwing, 0);
        
        if (currentTotalOwing + amount > maxTotalLoans) {
            throw new Error(`Loan exceeds club lending capacity. Max total: $${maxTotalLoans}, Current total debt: $${currentTotalOwing}, Requested: $${amount}`);
        }
    }
    
    // Only add to principal - interest accrues monthly
    this.owing += amount;
    this.totalOwing += amount;
    await this.save()
};

module.exports = Member