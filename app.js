const express = require('express');
const sequelize = require('./database');
const { errorHandler } = require('./utils/errors');
const { sanitizeInput } = require('./middleware/sanitizationMiddleware');
const setupSwagger = require('./swagger');

const authRoutes = require('./routes/auth');
const clubRoutes = require('./routes/clubs');
const memberRoutes = require('./routes/members');

const app = express();
app.use(express.json());

// .env
require('dotenv').config();

// Global middleware
app.use(sanitizeInput);

// Routes
app.use('/auth', authRoutes);
app.use('/clubs', clubRoutes);
app.use('/members', memberRoutes);

// Swagger documentation (public access)
setupSwagger(app);

// Error handling middleware (must be last)
app.use(errorHandler);

// Sync database and start server
sequelize.sync().then(() => {
  console.log('Database synced');
  app.listen(3000, () => console.log('Server running at http://localhost:3000'));
});