// Custom error classes for consistent error handling
// These provide structured errors without exposing internal details

class ValidationError extends Error {
    constructor(message = 'Invalid input provided') {
        super(message);
        this.name = 'ValidationError';
        this.statusCode = 400;
        this.isOperational = true;
    }
}

class NotFoundError extends Error {
    constructor(resource = 'Resource') {
        super(`${resource} not found`);
        this.name = 'NotFoundError';
        this.statusCode = 404;
        this.isOperational = true;
    }
}

class AuthorizationError extends Error {
    constructor(message = 'Not authorized to perform this action') {
        super(message);
        this.name = 'AuthorizationError';
        this.statusCode = 403;
        this.isOperational = true;
    }
}

class AuthenticationError extends Error {
    constructor(message = 'Authentication required') {
        super(message);
        this.name = 'AuthenticationError';
        this.statusCode = 401;
        this.isOperational = true;
    }
}

class ConflictError extends Error {
    constructor(resource = 'Resource', field = 'field') {
        super(`${resource} with this ${field} already exists`);
        this.name = 'ConflictError';
        this.statusCode = 409;
        this.isOperational = true;
    }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
    // Default error
    let statusCode = err.statusCode || 500;
    let message = err.message || 'An unexpected error occurred';
    let name = err.name || 'Error';

    // Don't expose internal server error details
    if (statusCode === 500) {
        message = 'An unexpected error occurred. Please try again later.';
    }

    // Log the full error for debugging
    console.error(`[${new Date().toISOString()}] ${name}: ${err.message}`);
    if (err.stack) {
        console.error(err.stack);
    }

    res.status(statusCode).json({
        error: message
    });
};

module.exports = {
    ValidationError,
    NotFoundError,
    AuthorizationError,
    AuthenticationError,
    ConflictError,
    errorHandler
};
