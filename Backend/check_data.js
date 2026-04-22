const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    console.log("--- Checking Database Users ---");
    const users = await prisma.user.findMany({
        include: {
            investorProfile: true,
            companyProfile: true
        }
    });
    
    users.forEach(u => {
        let name = "N/A";
        if (u.investorProfile) name = `${u.investorProfile.firstName} ${u.investorProfile.lastName}`;
        else if (u.companyProfile) name = u.companyProfile.companyName;
        
        console.log(`Email: ${u.email} | Role: ${u.role} | Name: ${name} | KYC: ${u.kycStatus}`);
    });

    console.log("\n--- Checking Share Listings ---");
    const listings = await prisma.shareListing.findMany({
        include: { company: true }
    });
    listings.forEach(l => {
        console.log(`Listing: ${l.title} | Company: ${l.company.companyName} | Price: ${l.pricePerShare} XAF | Available: ${l.availableShares}`);
    });
}

checkData()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
