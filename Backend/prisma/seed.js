const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding started...");

  // 1. Clear existing data (optional but good for clean slate)
  // Be careful with deleteMany order due to foreign keys
  console.log("Clearing existing data...");
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.escrowHold.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.shareListing.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.companyProfile.deleteMany();
  await prisma.investorProfile.deleteMany();
  await prisma.kycDocument.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 2. Create Admin
  console.log("Creating Admin user...");
  const admin = await prisma.user.create({
    data: {
      email: 'admin@sharetrade.com',
      passwordHash,
      role: 'ADMIN',
      kycStatus: 'APPROVED'
    }
  });

  // 3. Create Companies
  console.log("Creating Companies...");
  const company1 = await prisma.user.create({
    data: {
      email: 'invest@mtn.cm',
      passwordHash,
      role: 'COMPANY',
      kycStatus: 'APPROVED',
      companyProfile: {
        create: {
          companyName: 'MTN Cameroon',
          legalForm: 'SA',
          rccmNumber: 'RC/YAO/2000/B/1234',
          niuNumber: 'M123456789012A',
          shareCapital: 5000000000,
          sector: 'ICT',
          city: 'Douala',
          isVerified: true,
          verifiedAt: new Date()
        }
      },
      wallet: {
        create: { availableBalance: 0 }
      }
    },
    include: { companyProfile: true }
  });

  const company2 = await prisma.user.create({
    data: {
      email: 'info@dangote.cm',
      passwordHash,
      role: 'COMPANY',
      kycStatus: 'APPROVED',
      companyProfile: {
        create: {
          companyName: 'Dangote Cement Cameroon',
          legalForm: 'SA',
          rccmNumber: 'RC/DLA/2010/B/5678',
          niuNumber: 'M098765432109B',
          shareCapital: 10000000000,
          sector: 'MANUFACTURING',
          city: 'Douala',
          isVerified: true,
          verifiedAt: new Date()
        }
      },
      wallet: {
        create: { availableBalance: 0 }
      }
    },
    include: { companyProfile: true }
  });

  // 4. Create Investors
  console.log("Creating Investors...");
  const investor1 = await prisma.user.create({
    data: {
      email: 'investor1@example.com',
      passwordHash,
      role: 'INVESTOR',
      kycStatus: 'APPROVED',
      investorProfile: {
        create: {
          firstName: 'John',
          lastName: 'Doe',
          phone: '+237670000001',
          city: 'Yaoundé'
        }
      },
      wallet: {
        create: { availableBalance: 5000000 } // 5M XAF
      }
    }
  });

  const investor2 = await prisma.user.create({
    data: {
      email: 'investor2@example.com',
      passwordHash,
      role: 'INVESTOR',
      kycStatus: 'APPROVED',
      investorProfile: {
        create: {
          firstName: 'Jane',
          lastName: 'Smith',
          phone: '+237690000002',
          city: 'Douala'
        }
      },
      wallet: {
        create: { availableBalance: 15000000 } // 15M XAF
      }
    }
  });

  // 5. Create Share Listings
  console.log("Creating Share Listings...");
  const listing1 = await prisma.shareListing.create({
    data: {
      companyId: company1.companyProfile.id,
      title: 'MTN Cameroon Series A Primary Offering',
      description: 'Primary offering of MTN Cameroon shares for local investors.',
      totalShares: 100000,
      availableShares: 100000,
      pricePerShare: 20000, // 20,000 XAF
      minPurchase: 10,
      status: 'ACTIVE'
    }
  });

  const listing2 = await prisma.shareListing.create({
    data: {
      companyId: company2.companyProfile.id,
      title: 'Dangote Cement Expansion Equity',
      description: 'Capital raise for new plant expansion in Kribi.',
      totalShares: 50000,
      availableShares: 50000,
      pricePerShare: 50000, // 50,000 XAF
      minPurchase: 5,
      status: 'ACTIVE'
    }
  });

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
