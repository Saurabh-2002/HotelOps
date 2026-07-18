/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Seed script for HotelOps database.
 * Creates a super-admin, two demo tenants (small lodge + larger hotel),
 * and demo users/rooms for each tenant.
 * 
 * Idempotent: safe to run multiple times. Uses ON CONFLICT to skip duplicates.
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
  await sql`SET app.bypass_rls = 'true'`;
  const [superResult] = await sql`INSERT INTO "User" (id, name, email, "hashedPassword", role, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), 'Super Admin', 'super@hotelops.com', ${hashedPassword}, 'SUPER_ADMIN', NOW(), NOW())
    ON CONFLICT (email) DO NOTHING
    RETURNING email`;
  console.log(superResult ? '  Created: super@hotelops.com' : '  Already exists: super@hotelops.com');

  // --- Tenant 1: Sunrise Lodge (small, no restaurant) ---
  console.log('\n--- Creating Tenant 1: Sunrise Lodge ---');
  await sql`SET app.bypass_rls = 'true'`;

  // Use a deterministic approach: find or create
  let tenant1Row = await sql`SELECT id, name FROM "Tenant" WHERE name = 'Sunrise Lodge' LIMIT 1`;
  if (tenant1Row.length === 0) {
    tenant1Row = await sql`INSERT INTO "Tenant" (id, name, gstin, "subscriptionTier", "activeModules", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'Sunrise Lodge', '29ABCDE1234F1Z1', 'BASIC', '{}', NOW(), NOW())
      RETURNING id, name`;
  }
  const tenant1 = tenant1Row[0];
  console.log('  Tenant:', tenant1.name, '| ID:', tenant1.id);

  // Users for Sunrise Lodge
  const slUsers = [
    { name: 'Rajesh Kumar', email: 'rajesh@sunriselodge.com', role: 'OWNER' },
    { name: 'Amit Sharma',  email: 'amit@sunriselodge.com',   role: 'FRONT_DESK' },
  ];
  for (const u of slUsers) {
    const [r] = await sql`INSERT INTO "User" (id, "tenantId", name, email, "hashedPassword", role, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${tenant1.id}, ${u.name}, ${u.email}, ${hashedPassword}, ${u.role}, NOW(), NOW())
      ON CONFLICT (email) DO NOTHING
      RETURNING email`;
    console.log(r ? `  Created ${u.role}: ${u.email}` : `  Already exists: ${u.email}`);
  }

  // 5 rooms for the small lodge
  const lodge_rooms = [
    { num: '101', type: 'Standard', floor: '1', rate: 1200 },
    { num: '102', type: 'Standard', floor: '1', rate: 1200 },
    { num: '103', type: 'Deluxe',   floor: '1', rate: 1800 },
    { num: '201', type: 'Standard', floor: '2', rate: 1200 },
    { num: '202', type: 'Deluxe',   floor: '2', rate: 1800 },
  ];
  let lodgeRoomCount = 0;
  for (const r of lodge_rooms) {
    const [res] = await sql`INSERT INTO "Room" (id, "tenantId", "roomNumber", "legacyType", floor, "baseRate", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${tenant1.id}, ${r.num}, ${r.type}, ${r.floor}, ${r.rate}, NOW(), NOW())
      ON CONFLICT ("tenantId", "roomNumber") DO NOTHING
      RETURNING id`;
    if (res) lodgeRoomCount++;
  }
  console.log(`  Rooms created: ${lodgeRoomCount} new (${lodge_rooms.length - lodgeRoomCount} already existed)`);

  // --- Tenant 2: Grand Palace Hotel (larger, with restaurant) ---
  console.log('\n--- Creating Tenant 2: Grand Palace Hotel ---');
  let tenant2Row = await sql`SELECT id, name FROM "Tenant" WHERE name = 'Grand Palace Hotel' LIMIT 1`;
  if (tenant2Row.length === 0) {
    tenant2Row = await sql`INSERT INTO "Tenant" (id, name, gstin, "subscriptionTier", "activeModules", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'Grand Palace Hotel', '27FGHIJ5678K3Z9', 'PRO', '{"RESTAURANT","HOUSEKEEPING"}', NOW(), NOW())
      RETURNING id, name`;
  }
  const tenant2 = tenant2Row[0];
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
    const [r] = await sql`INSERT INTO "User" (id, "tenantId", name, email, "hashedPassword", role, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${tenant2.id}, ${u.name}, ${u.email}, ${hashedPassword}, ${u.role}, NOW(), NOW())
      ON CONFLICT (email) DO NOTHING
      RETURNING email`;
    console.log(r ? `  Created ${u.role}: ${u.email}` : `  Already exists: ${u.email}`);
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
  let hotelRoomCount = 0;
  for (const r of hotel_rooms) {
    const [res] = await sql`INSERT INTO "Room" (id, "tenantId", "roomNumber", "legacyType", floor, "baseRate", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${tenant2.id}, ${r.num}, ${r.type}, ${r.floor}, ${r.rate}, NOW(), NOW())
      ON CONFLICT ("tenantId", "roomNumber") DO NOTHING
      RETURNING id`;
    if (res) hotelRoomCount++;
  }
  console.log(`  Rooms created: ${hotelRoomCount} new (${hotel_rooms.length - hotelRoomCount} already existed)`);

  console.log('\n✅ Seed complete!');
  console.log('Login credentials for all users: password = admin123');
}

main()
  .catch((e: any) => {
    console.error('Seed failed:', e);
    process.exit(1);
  });
