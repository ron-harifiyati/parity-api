const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Club = sequelize.define('Club', {
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
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    monthlyContribution: {
        type: DataTypes.INTEGER,
        defaultValue: 25,
        allowNull: false
    },
    startDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    paymentDay: {
        type: DataTypes.INTEGER,
        defaultValue: 30,
        allowNull: false
    },
    autoLoanOnMissedPayment: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    gracePeriodDays: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: false
    },
    durationMonths: {
        type: DataTypes.INTEGER,
        defaultValue: 12,
        allowNull: false
    },
    lendingLimit: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    interestRate: {
        type: DataTypes.INTEGER,
        defaultValue: 10,
        allowNull: false
    }
});

module.exports = Club