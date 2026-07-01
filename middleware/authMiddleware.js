const jwt = require('jsonwebtoken')
require('dotenv').config()
const SECRET_KEY = process.env.SECRET_KEY
const { AuthenticationError } = require('../utils/errors');

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return next(new AuthenticationError('Authorization token is required'));
    };

    const token = authHeader.split(' ')[1];
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return next(new AuthenticationError('Authorization expired'));
        };
        req.user = decoded;
        next()
    })
}