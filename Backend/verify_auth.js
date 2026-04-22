const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const API_URL = 'http://localhost:5000/api';

async function verifyAll() {
    console.log('🚀 Starting ShareTrade System Verification...\n');

    // 1. Check Database Connection
    console.log('📁 Testing Database Connectivity (Prisma)...');
    try {
        const userCount = await prisma.user.count();
        console.log(`✅ DB Connected. Found ${userCount} users.\n`);
    } catch (error) {
        console.error('❌ Database Connection Failed:', error.message);
        process.exit(1);
    }

    // 2. Check API Health
    console.log(`🌐 Testing API Health (${API_URL}/health)...`);
    try {
        const response = await fetch(`${API_URL}/health`);
        const data = await response.json();
        console.log(`✅ API Healthy: ${JSON.stringify(data)}\n`);
    } catch (error) {
        console.error('❌ API Health Check Failed. Is the backend running?');
        console.error('Error:', error.message);
    }

    // 3. Test Admin Login
    console.log('🔐 Testing Admin Login...');
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@sharetrade.com',
                password: 'Password123!'
            })
        });
        const resData = await response.json();
        if (resData.success) {
            console.log('✅ Admin Login Successful.');
            console.log(`👤 Logged in as: ${resData.data.user.displayName}\n`);
        } else {
            console.error('❌ Login failed:', resData.message);
        }
    } catch (error) {
        console.error('❌ Admin Login Failed:', error.message);
    }

    // 4. Test Mock Registration (Investor)
    console.log('📝 Testing Mock Investor Registration...');
    const testEmail = `test_${Math.floor(Math.random() * 10000)}@example.com`;
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                role: 'INVESTOR',
                firstName: 'Verify',
                lastName: 'Bot',
                email: testEmail,
                password: 'Password123!',
                city: 'Yaoundé',
                region: 'Centre'
            })
        });
        const resData = await response.json();
        if (resData.success) {
            console.log(`✅ Registration Successful for: ${testEmail}\n`);
            
            // Clean up: delete the test user
            await prisma.user.delete({ where: { email: testEmail } });
            console.log('🧹 Cleanup: Test user removed.');
        } else {
            console.error('❌ Registration Failed:', resData.message);
            if (resData.stack) console.error(resData.stack);
        }
    } catch (error) {
        console.error('❌ Registration Failed:', error.message);
    }

    console.log('\n✨ Verification complete.');
    await prisma.$disconnect();
}

verifyAll();
