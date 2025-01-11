  
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();


// In a real application, you'd want to store this securely,
// preferably in environment variables
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: process.env.ADMIN_ACCESS_KEY,
    token: process.env.ADMIN_ACCESS_KEY
};

// Verify admin token
export function verifyAdmin(token) {
    return token === ADMIN_CREDENTIALS.token;
}

// Generate session token
export function generateToken(username, password) {
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        return ADMIN_CREDENTIALS.token;
    }
    return null;
}

// Hash function for passwords (use in production)
export function hashPassword(password) {
    return crypto
        .createHash('sha256')
        .update(password)
        .digest('hex');
}