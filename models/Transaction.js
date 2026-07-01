const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Transaction = sequelize.define('Transaction', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
        allowNull: false,
        primaryKey: true
    },
    memberId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    clubId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    period: {
        type: DataTypes.STRING,
        allowNull: false
    },

    investAmount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    interestAmount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    payLoanAmount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    loanAmount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    withdrawalAmount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    }
});

module.exports = Transaction