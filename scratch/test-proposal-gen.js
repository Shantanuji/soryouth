const { SignJWT } = require('jose');
require('dotenv').config();

const secretKey = process.env.JWT_SECRET;
const key = new TextEncoder().encode(secretKey);

async function encrypt(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(key);
}

async function testGen() {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const sessionToken = await encrypt({
    userId: '88af423c-75f5-42a8-83ae-51790906f5f3',
    name: 'Super Admin',
    email: 'admin@soryouth.com',
    role: 'Admin',
    viewPermission: 'ALL',
    profileImage: null,
    expires
  });

  const payload = {
    templateId: "cmqt8rz9a0000waywgul1vlg9",
    data: {
      proposalNumber: "PROP-TEST-001",
      name: "Suresh Patil",
      clientType: "Residential",
      contactPerson: "Suresh Patil",
      location: "Pune",
      capacity: 10,
      moduleType: "Mono PERC",
      moduleWattage: "540",
      dcrStatus: "DCR",
      inverterRating: 10,
      inverterQty: 1,
      ratePerWatt: 50,
      proposalDate: "2026-07-02T00:00:00.000Z",
      baseAmount: 500000,
      cgstAmount: 22250,
      sgstAmount: 22250,
      subtotalAmount: 544500,
      finalAmount: 544500,
      subsidyAmount: 78000,
      requiredSpace: 100,
      generationPerDay: 40,
      generationPerYear: 14600,
      unitRate: 8,
      savingsPerYear: 116800,
      laKitQty: 1,
      acdbDcdbQty: 1,
      earthingKitQty: 3
    }
  };

  console.log("Sending POST to http://localhost:9002/api/proposals/generate...");
  try {
    const res = await globalThis.fetch('http://localhost:9002/api/proposals/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionToken}`
      },
      body: JSON.stringify(payload)
    });
    console.log("Status:", res.status);
    const json = await res.json();
    console.log("Response:", JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

testGen();
