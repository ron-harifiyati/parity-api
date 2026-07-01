const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger options
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Parity API - Rotating Credit Association Manager',
      version: '1.0.0',
      description: 'Digital platform for managing informal savings groups (mukando/round) with member verification, contribution tracking, and automated loan calculations.',
      contact: {
        name: 'Ron Harifiyati',
      },
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local development server' },
      { url: 'https://parity-api.onrender.com', description: 'Production server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token in the format: Bearer <token>',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: 'User unique identifier' },
            username: { type: 'string', example: 'johndoe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            password: { type: 'string', format: 'password', example: 'Password123' },
          },
          required: ['username', 'password'],
        },
        Club: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: 'Club unique identifier' },
            userId: { type: 'string', format: 'uuid', description: 'Owner user ID' },
            title: { type: 'string', example: 'My Savings Club' },
            monthlyContribution: { type: 'integer', example: 25, description: 'Monthly contribution amount' },
            startDate: { type: 'string', format: 'date', description: 'Club start date' },
            paymentDay: { type: 'integer', example: 30, description: 'Day of month for payments' },
            autoLoanOnMissedPayment: { type: 'boolean', example: true, description: 'Auto-loan on missed payment' },
            gracePeriodDays: { type: 'integer', example: 1, description: 'Grace period in days' },
            durationMonths: { type: 'integer', example: 12, description: 'Club duration in months' },
            lendingLimit: { type: 'integer', example: 300, description: 'Maximum lending limit' },
            interestRate: { type: 'integer', example: 10, description: 'Interest rate percentage' },
            earlyWithdrawalPenalty: { type: 'integer', example: 10, description: 'Early withdrawal penalty' },
          },
          required: ['title'],
        },
        Member: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: 'Member unique identifier' },
            userId: { type: 'string', format: 'uuid', description: 'User ID' },
            username: { type: 'string', example: 'johndoe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            clubId: { type: 'string', format: 'uuid', description: 'Club ID' },
            isTreasurer: { type: 'boolean', example: false, description: 'Treasurer role flag' },
            lastInterestAccrualDate: { type: 'string', format: 'date-time', description: 'Last interest accrual date' },
            withdrawnAt: { type: 'string', format: 'date-time', description: 'Withdrawal date' },
            investment: { type: 'integer', example: 100, description: 'Total investment amount' },
            interestAcrued: { type: 'integer', example: 10, description: 'Total interest accrued' },
            totalInvestment: { type: 'integer', example: 110, description: 'Total investment including interest' },
            owing: { type: 'integer', example: 50, description: 'Principal amount owing' },
            interestOwing: { type: 'integer', example: 5, description: 'Interest amount owing' },
            totalOwing: { type: 'integer', example: 55, description: 'Total amount owing' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', description: 'Transaction unique identifier' },
            memberId: { type: 'string', format: 'uuid', description: 'Member ID' },
            clubId: { type: 'string', format: 'uuid', description: 'Club ID' },
            period: { type: 'string', example: '01-2024', description: 'Transaction period (MM-YYYY)' },
            investAmount: { type: 'integer', example: 25, description: 'Investment amount' },
            interestAmount: { type: 'integer', example: 5, description: 'Interest amount' },
            payLoanAmount: { type: 'integer', example: 10, description: 'Loan payment amount' },
            loanAmount: { type: 'integer', example: 50, description: 'Loan amount' },
            withdrawalAmount: { type: 'integer', example: 90, description: 'Withdrawal amount' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Invalid input provided' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Login Successful' },
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          },
        },
        MessageResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Operation successful' },
          },
        },
      },
    },
  },
  apis: [
    './routes/auth.js',
    './routes/clubs.js',
    './routes/members.js',
  ],
};

const specs = swaggerJsdoc(options);

module.exports = (app) => {
  // Swagger UI
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));
  
  console.log('Swagger docs available at /docs');
};
