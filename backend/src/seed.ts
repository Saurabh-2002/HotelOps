/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Seed script for HotelOps database.
 * Creates a super-admin, two demo tenants (small lodge + larger hotel),
 * and demo users/rooms for each tenant.
 * 
 * Run with: npm run seed
 */

// Load env BEFORE anything else
require('dotenv').config();

const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcrypt');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('ERROR: DATABASE_URL is not set. Check your .env file.');
  process.exit(1);
}

console.log('Connecting to:', connectionString.replace(/:[^:@]+@/, ':****@'));

const sql = neon(connectionString);

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // --- Super Admin (no tenant) ---
  console.log('\n--- Creating Super Admin ---');
  const existingSuperAdmin = await sql`SELECT id FROM "User" WHERE email = 'super@hotelops.com'`;
  if (existingSuperAdmin.length === 0) {
    await sql`SET app.bypass_rls = 'true'`;
    await sql`INSERT INTO "User" (id, name, email, "hashedPassword", role, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'Super Admin', 'super@hotelops.com', ${hashedPassword}, 'SUPER_ADMIN', NOW(), NOW())`;
    console.log('  Super Admin: super@hotelops.com');
  } else {
    console.log('  Super Admin already exists, skipping.');
  }

  // --- Tenant 1: Sunrise Lodge (small, no restaurant) ---
  console.log('\n--- Creating Tenant 1: Sunrise Lodge ---');
  await sql`SET app.bypass_rls = 'true'`;

  const [tenant1] = await sql`INSERT INTO "Tenant" (id, name, gstin, "subscriptionTier", "activeModules", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), 'Sunrise Lodge', '29ABCDE1234F1Z1', 'BASIC', '{}', NOW(), NOW())
    RETURNING id, name`;
  console.log('  Tenant:', tenant1.name, '| ID:', tenant1.id);

  await sql`INSERT INTO "User" (id, "tenantId", name, email, "hashedPassword", role, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), ${tenant1.id}, 'Rajesh Kumar', 'rajesh@sunriselodge.com', ${hashedPassword}, 'OWNER', NOW(), NOW())`;
  console.log('  Owner: rajesh@sunriselodge.com');

  await sql`INSERT INTO "User" (id, "tenantId", name, email, "hashedPassword", role, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), ${tenant1.id}, 'Amit Sharma', 'amit@sunriselodge.com', ${hashedPassword}, 'FRONT_DESK', NOW(), NOW())`;
  console.log('  Front Desk: amit@sunriselodge.com');

  // 5 rooms for the small lodge
  const lodge_rooms = [
    { num: '101', type: 'Standard', floor: '1', rate: 1200 },
    { num: '102', type: 'Standard', floor: '1', rate: 1200 },
    { num: '103', type: 'Deluxe',   floor: '1', rate: 1800 },
    { num: '201', type: 'Standard', floor: '2', rate: 1200 },
    { num: '202', type: 'Deluxe',   floor: '2', rate: 1800 },
  ];
  for (const r of lodge_rooms) {
    await sql`INSERT INTO "Room" (id, "tenantId", "roomNumber", "roomType", floor, "baseRate", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${tenant1.id}, ${r.num}, ${r.type}, ${r.floor}, ${r.rate}, NOW(), NOW())`;
  }
  console.log('  Rooms created:', lodge_rooms.length);

  // --- Tenant 2: Grand Palace Hotel (larger, with restaurant) ---
  console.log('\n--- Creating Tenant 2: Grand Palace Hotel ---');
  const [tenant2] = await sql`INSERT INTO "Tenant" (id, name, gstin, "subscriptionTier", "activeModules", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), 'Grand Palace Hotel', '27FGHIJ5678K3Z9', 'PRO', '{"RESTAURANT","HOUSEKEEPING"}', NOW(), NOW())
    RETURNING id, name`;
  console.log('  Tenant:', tenant2.name, '| ID:', tenant2.id);

  // Users for Grand Palace
  const gpUsers = [
    { name: 'Priya Patel',    email: 'priya@grandpalace.com',   role: 'OWNER' },
    { name: 'Suresh Menon',   email: 'suresh@grandpalace.com',  role: 'MANAGER' },
    { name: 'Neha Gupta',     email: 'neha@grandpalace.com',    role: 'FRONT_DESK' },
    { name: 'Vikram Singh',   email: 'vikram@grandpalace.com',  role: 'RESTAURANT' },
    { name: 'Lakshmi Devi',   email: 'lakshmi@grandpalace.com', role: 'HOUSEKEEPING' },
    { name: 'Ravi Accountant',email: 'ravi@grandpalace.com',    role: 'ACCOUNTANT' },
  ];
  for (const u of gpUsers) {
    await sql`INSERT INTO "User" (id, "tenantId", name, email, "hashedPassword", role, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${tenant2.id}, ${u.name}, ${u.email}, ${hashedPassword}, ${u.role}, NOW(), NOW())`;
    console.log(`  ${u.role}: ${u.email}`);
  }

  // 15 rooms for the larger hotel
  const hotel_rooms = [
    { num: '101', type: 'Standard',  floor: '1', rate: 2500 },
    { num: '102', type: 'Standard',  floor: '1', rate: 2500 },
    { num: '103', type: 'Standard',  floor: '1', rate: 2500 },
    { num: '104', type: 'Deluxe',    floor: '1', rate: 4000 },
    { num: '105', type: 'Deluxe',    floor: '1', rate: 4000 },
    { num: '201', type: 'Deluxe',    floor: '2', rate: 4000 },
    { num: '202', type: 'Deluxe',    floor: '2', rate: 4000 },
    { num: '203', type: 'Suite',     floor: '2', rate: 7500 },
    { num: '204', type: 'Suite',     floor: '2', rate: 7500 },
    { num: '301', type: 'Premium',   floor: '3', rate: 5500 },
    { num: '302', type: 'Premium',   floor: '3', rate: 5500 },
    { num: '303', type: 'Premium',   floor: '3', rate: 5500 },
    { num: '304', type: 'Suite',     floor: '3', rate: 7500 },
    { num: '401', type: 'Penthouse', floor: '4', rate: 12000 },
    { num: '402', type: 'Penthouse', floor: '4', rate: 12000 },
  ];
  for (const r of hotel_rooms) {
    await sql`INSERT INTO "Room" (id, "tenantId", "roomNumber", "roomType", floor, "baseRate", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${tenant2.id}, ${r.num}, ${r.type}, ${r.floor}, ${r.rate}, NOW(), NOW())`;
  }
  console.log('  Rooms created:', hotel_rooms.length);

  console.log('\n✅ Seed complete!');
  console.log('Login credentials for all users: password = admin123');
}

main()
  .catch((e: any) => {
    console.error('Seed failed:', e);
    process.exit(1);
  });
