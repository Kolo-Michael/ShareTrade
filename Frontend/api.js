// API Configuration and Utility Functions

const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Gets the stored JWT token
 */
function getToken() {
    return localStorage.getItem('st-token');
}

/**
 * Sets the JWT token
 */
function setToken(token) {
    if (token) {
        localStorage.setItem('st-token', token);
    } else {
        localStorage.removeItem('st-token');
    }
}

/**
 * Gets the stored user object
 */
function getUser() {
    const userStr = localStorage.getItem('st-user');
    return userStr ? JSON.parse(userStr) : null;
}

/**
 * Sets the user object
 */
function setUser(user) {
    if (user) {
        localStorage.setItem('st-user', JSON.stringify(user));
    } else {
        localStorage.removeItem('st-user');
    }
}

/**
 * Core fetch wrapper that automatically handles Authorization headers and JSON parsing.
 */
async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = {};
    
    // If body is FormData, don't set Content-Type header (browser sets it with boundary marker)
    // If it's a regular object, set json
    if (body && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(body);
    }

    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method,
            headers,
            body: body || undefined
        });

        const data = await response.json();

        // Check if unauthorized (token expired/invalid)
        if (response.status === 401) {
            setToken(null);
            setUser(null);
            // Don't auto-redirect on login page itself
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = '/login.html';
            }
        }

        if (!response.ok) {
            throw new Error(data.message || 'An error occurred');
        }

        return data;
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
}

// Global UI helpers (Toasts/Alerts could be added here if needed)
function showError(msg) {
    alert(msg); // Replace with nice toast later
}

function showSuccess(msg) {
    alert(msg); // Replace with nice toast later
}

// ── Protect Routes ──
// Run this immediately on protected pages (assumes standard dashboard pathing)
const currentPath = window.location.pathname;
const isPublicPage = currentPath.endsWith('/') || currentPath.endsWith('index.html') || 
                     currentPath.endsWith('login.html') || currentPath.endsWith('register.html');

if (!isPublicPage && !getToken()) {
    // Redirect to login if unauthenticated on a protected page
    // Needs proper relative path handling based on nesting
    const depth = (currentPath.match(/\//g) || []).length;
    let rootPrefix = './';
    if (depth > 1) {
        rootPrefix = '../'.repeat(depth - 1); // rough approximation, can be refined
    }
    // Hard fallback for local testing:
    window.location.href = currentPath.substring(0, currentPath.indexOf('Frontend') + 9) + 'login.html';
}

// Export functions for usage
window.api = {
    call: apiCall,
    getToken,
    setToken,
    getUser,
    setUser,
    showError,
    showSuccess
};
