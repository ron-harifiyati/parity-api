// Simple validation tests
// Run with: node tests/validation.test.js

const {
    validateEmail,
    validatePassword,
    validatePositiveInteger,
    validatePeriod,
    validateStringLength
} = require('../middleware/sanitizationMiddleware');

const { ValidationError } = require('../utils/errors');

let passed = 0;
let failed = 0;

function test(description, fn) {
    try {
        fn();
        console.log(`✓ ${description}`);
        passed++;
    } catch (err) {
        console.log(`✗ ${description}`);
        console.log(`  Error: ${err.message}`);
        failed++;
    }
}

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

function assertThrows(fn, errorType, message) {
    try {
        fn();
        throw new Error(`Expected ${errorType.name} to be thrown`);
    } catch (err) {
        if (!(err instanceof errorType)) {
            throw new Error(`${message}: expected ${errorType.name}, got ${err.constructor.name}`);
        }
    }
}

console.log('\n=== Validation Tests ===\n');

// Email validation tests
console.log('Email Validation:');
test('Valid email', () => {
    const result = validateEmail('test@example.com', 'Email');
    assertEquals(result, 'test@example.com', 'Email should be lowercase');
});

test('Invalid email - missing @', () => {
    assertThrows(() => validateEmail('testexample.com', 'Email'), ValidationError, 'Should throw for invalid email');
});

test('Invalid email - missing domain', () => {
    assertThrows(() => validateEmail('test@', 'Email'), ValidationError, 'Should throw for missing domain');
});

// Password validation tests
console.log('\nPassword Validation:');
test('Valid password - meets all requirements', () => {
    validatePassword('Password123', 'Password');
});

test('Invalid password - too short', () => {
    assertThrows(() => validatePassword('Pass1', 'Password'), ValidationError, 'Should throw for short password');
});

test('Invalid password - missing uppercase', () => {
    assertThrows(() => validatePassword('password123', 'Password'), ValidationError, 'Should throw for missing uppercase');
});

test('Invalid password - missing lowercase', () => {
    assertThrows(() => validatePassword('PASSWORD123', 'Password'), ValidationError, 'Should throw for missing lowercase');
});

test('Invalid password - missing number', () => {
    assertThrows(() => validatePassword('PasswordABC', 'Password'), ValidationError, 'Should throw for missing number');
});

// Positive integer validation tests
console.log('\nPositive Integer Validation:');
test('Valid positive integer', () => {
    validatePositiveInteger(5, 'Value');
});

test('Invalid - zero', () => {
    assertThrows(() => validatePositiveInteger(0, 'Value'), ValidationError, 'Should throw for zero');
});

test('Invalid - negative', () => {
    assertThrows(() => validatePositiveInteger(-1, 'Value'), ValidationError, 'Should throw for negative');
});

test('Invalid - not a number', () => {
    assertThrows(() => validatePositiveInteger('abc', 'Value'), ValidationError, 'Should throw for non-number');
});

test('Invalid - float', () => {
    assertThrows(() => validatePositiveInteger(3.14, 'Value'), ValidationError, 'Should throw for float');
});

// Period validation tests
console.log('\nPeriod Validation:');
test('Valid period', () => {
    validatePeriod('01-2024', 'Period');
});

test('Valid period - December', () => {
    validatePeriod('12-2024', 'Period');
});

test('Invalid period - wrong format', () => {
    assertThrows(() => validatePeriod('2024-01', 'Period'), ValidationError, 'Should throw for wrong format');
});

test('Invalid period - month out of range', () => {
    assertThrows(() => validatePeriod('13-2024', 'Period'), ValidationError, 'Should throw for month > 12');
});

test('Invalid period - year out of range', () => {
    assertThrows(() => validatePeriod('01-1999', 'Period'), ValidationError, 'Should throw for year < 2000');
});

// String length validation tests
console.log('\nString Length Validation:');
test('Valid string length', () => {
    const result = validateStringLength('hello', 'Value', 3, 10);
    assertEquals(result, 'hello', 'Should return trimmed string');
});

test('String with whitespace', () => {
    const result = validateStringLength('  hello  ', 'Value', 3, 10);
    assertEquals(result, 'hello', 'Should trim whitespace');
});

test('Invalid - too short', () => {
    assertThrows(() => validateStringLength('hi', 'Value', 3, 10), ValidationError, 'Should throw for too short');
});

test('Invalid - too long', () => {
    assertThrows(() => validateStringLength('this is way too long', 'Value', 3, 10), ValidationError, 'Should throw for too long');
});

// Summary
console.log('\n=== Test Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}\n`);

if (failed > 0) {
    process.exit(1);
}
