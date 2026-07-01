// Input sanitization middleware
// Trims strings, validates UUIDs, and prevents common injection attacks

const { ValidationError } = require('../utils/errors');

// Regex patterns for validation
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PERIOD_PATTERN = /^\d{2}-\d{4}$/; // MM-YYYY format

/**
 * Sanitizes and validates request body, query, and params
 */
const sanitizeInput = (req, res, next) => {
    try {
        // Sanitize request body
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body);
        }

        // Sanitize query parameters
        if (req.query && typeof req.query === 'object') {
            req.query = sanitizeObject(req.query);
        }

        // Sanitize route parameters
        if (req.params && typeof req.params === 'object') {
            req.params = sanitizeObject(req.params);
        }

        next();
    } catch (err) {
        next(err);
    }
};

/**
 * Recursively sanitizes an object's values
 */
function sanitizeObject(obj) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) {
            sanitized[key] = value;
        } else if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value);
        } else if (typeof value === 'number') {
            // Ensure numbers are finite
            if (!Number.isFinite(value)) {
                throw new ValidationError(`Invalid number value for ${key}`);
            }
            sanitized[key] = value;
        } else if (typeof value === 'boolean') {
            sanitized[key] = value;
        } else if (Array.isArray(value)) {
            sanitized[key] = value.map(item => 
                typeof item === 'string' ? sanitizeString(item) : item
            );
        } else if (typeof value === 'object') {
            sanitized[key] = sanitizeObject(value);
        } else {
            sanitized[key] = value;
        }
    }
    
    return sanitized;
}

/**
 * Sanitizes a string by trimming and escaping special characters
 */
function sanitizeString(str) {
    if (str === null || str === undefined) return str;
    
    // Trim whitespace
    let sanitized = str.trim();
    
    // Escape HTML to prevent XSS (basic protection)
    sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    
    return sanitized;
}

/**
 * Validates a UUID string
 */
const validateUUID = (value, fieldName = 'ID') => {
    if (!value || typeof value !== 'string') {
        throw new ValidationError(`${fieldName} is required and must be a valid UUID`);
    }
    if (!UUID_PATTERN.test(value)) {
        throw new ValidationError(`${fieldName} must be a valid UUID`);
    }
    return true;
};

/**
 * Validates an email address
 */
const validateEmail = (email, fieldName = 'Email') => {
    if (!email || typeof email !== 'string') {
        throw new ValidationError(`${fieldName} is required`);
    }
    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
        throw new ValidationError(`${fieldName} must be a valid email address`);
    }
    return trimmedEmail;
};

/**
 * Validates a password meets complexity requirements
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 */
const validatePassword = (password, fieldName = 'Password') => {
    if (!password || typeof password !== 'string') {
        throw new ValidationError(`${fieldName} is required`);
    }
    if (password.length < 8) {
        throw new ValidationError(`${fieldName} must be at least 8 characters long`);
    }
    if (!/[A-Z]/.test(password)) {
        throw new ValidationError(`${fieldName} must contain at least one uppercase letter`);
    }
    if (!/[a-z]/.test(password)) {
        throw new ValidationError(`${fieldName} must contain at least one lowercase letter`);
    }
    if (!/[0-9]/.test(password)) {
        throw new ValidationError(`${fieldName} must contain at least one number`);
    }
    return true;
};

/**
 * Validates a positive integer
 */
const validatePositiveInteger = (value, fieldName = 'Value', min = 1) => {
    if (value === null || value === undefined) {
        throw new ValidationError(`${fieldName} is required`);
    }
    if (typeof value !== 'number' || !Number.isInteger(value) || value < min) {
        throw new ValidationError(`${fieldName} must be a positive integer`);
    }
    return true;
};

/**
 * Validates a period string (MM-YYYY format)
 */
const validatePeriod = (period, fieldName = 'Period') => {
    if (!period || typeof period !== 'string') {
        throw new ValidationError(`${fieldName} is required`);
    }
    if (!PERIOD_PATTERN.test(period)) {
        throw new ValidationError(`${fieldName} must be in MM-YYYY format (e.g., 01-2024)`);
    }
    
    const [month, year] = period.split('-');
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    if (monthNum < 1 || monthNum > 12) {
        throw new ValidationError(`${fieldName} month must be between 01 and 12`);
    }
    if (yearNum < 2000 || yearNum > 2100) {
        throw new ValidationError(`${fieldName} year must be between 2000 and 2100`);
    }
    
    return true;
};

/**
 * Validates a string length
 */
const validateStringLength = (value, fieldName = 'Value', min = 1, max = 100) => {
    if (value === null || value === undefined) {
        throw new ValidationError(`${fieldName} is required`);
    }
    if (typeof value !== 'string') {
        throw new ValidationError(`${fieldName} must be a string`);
    }
    const trimmed = value.trim();
    if (trimmed.length < min || trimmed.length > max) {
        throw new ValidationError(`${fieldName} must be between ${min} and ${max} characters`);
    }
    return trimmed;
};

module.exports = {
    sanitizeInput,
    validateUUID,
    validateEmail,
    validatePassword,
    validatePositiveInteger,
    validatePeriod,
    validateStringLength,
    UUID_PATTERN,
    EMAIL_PATTERN,
    PERIOD_PATTERN
};
