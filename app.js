const express = require('express');
const sequelize = require('./database');

const authRoutes = require('./routes/auth');
const clubRoutes = require('./routes/clubs');
const memberRoutes = require('./routes/members');

const app = express();
app.use(express.json());

// .env
require('dotenv').config();

// Routes
app.use('/auth', authRoutes);
app.use('/clubs', clubRoutes);
app.use('/members', memberRoutes);

// Sync database and start server
sequelize.sync().then(() => {
  console.log('Database synced');
  app.listen(3000, () => console.log('Server running at http://localhost:3000'));
});