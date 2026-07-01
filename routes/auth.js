require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { Op } = require('sequelize');
const { ValidationError, ConflictError, AuthenticationError, errorHandler } = require('../utils/errors');
const { validateEmail, validatePassword, validateStringLength } = require('../middleware/sanitizationMiddleware');

const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY;

//Register user
router.post('/register', async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        
        // Validate required fields
        if (!username) {
            throw new ValidationError('Username is required');
        }
        if (!password) {
            throw new ValidationError('Password is required');
        }
        
        // Validate username
        validateStringLength(username, 'Username', 3, 50);
        
        // Validate email if provided
        let validatedEmail = null;
        if (email) {
            validatedEmail = validateEmail(email, 'Email');
        }
        
        // Validate password complexity
        validatePassword(password, 'Password');
        
        // Check if username already exists
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            throw new ConflictError('User', 'username');
        }
        
        // Check if email already exists (if provided)
        if (validatedEmail) {
            const existingEmail = await User.findOne({ where: { email: validatedEmail } });
            if (existingEmail) {
                throw new ConflictError('User', 'email');
            }
        }

        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({ 
            username, 
            email: validatedEmail, 
            password: hashed 
        });

        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1d' });
        res.status(201).json({ message: 'Successfully created account', token })
    } catch (err) {
        next(err);
    }
});

//Login user
router.post('/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        
        // Validate required fields
        if (!username) {
            throw new ValidationError('Username or email is required');
        }
        if (!password) {
            throw new ValidationError('Password is required');
        }

        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { username },
                    { email: username }
                ]
            }
        });
        if (!user) {
            throw new AuthenticationError('Invalid username, email, or password');
        };

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            throw new AuthenticationError('Invalid username, email, or password');
        };

        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1d' });
        res.json({ message: 'Login Successful', token })
    } catch (err) {
        next(err);
    }
});

module.exports = router