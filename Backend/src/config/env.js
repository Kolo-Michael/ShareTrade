require('dotenv').config();

const env = {
  PORT: parseInt(process.env.PORT) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5500',
};

// Validate required vars
const required = ['DATABASE_URL', 'JWT_SECRET'];
for (const key of required) {
  if (!env[key] || env[key].includes('USER:PASSWORD')) {
    console.warn(`⚠️  Missing or placeholder environment variable: ${key}`);
  }
}

module.exports = env;
