/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Creates a non-superuser role for the application to use,
 * so that FORCE ROW LEVEL SECURITY actually applies.
 */
require('dotenv').config();

const { neon } = require('@neondatabase/serverless');

const connectionString = process.env.DATABASE_URL;
const rolePassword = process.env.APP_DATABASE_ROLE_PASSWORD;

if (!connectionString) {
  console.error('ERROR: DATABASE_URL is not set.');
  process.exit(1);
}

if (!rolePassword) {
  console.error('ERROR: APP_DATABASE_ROLE_PASSWORD is not set. A secure password is required.');
  process.exit(1);
}

const sql = neon(connectionString);

async function main() {
  console.log('Setting up application role for RLS...');

  // Check if role already exists
  const existing = await sql`SELECT 1 FROM pg_roles WHERE rolname = 'hotelops_app'`;
  
  if (existing.length === 0) {
    // Create the app role
    try {
      await sql(`CREATE ROLE hotelops_app LOGIN PASSWORD '${rolePassword}'`);
      console.log('Created role: hotelops_app');
    } catch (e) {
      console.error('Failed to create role.');
      process.exit(1);
    }
  } else {
    console.log('Role hotelops_app already exists');
  }

  // Grant necessary permissions
  await sql`GRANT USAGE ON SCHEMA public TO hotelops_app`;
  await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hotelops_app`;
  await sql`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hotelops_app`;
  
  // Grant default privileges for future tables
  await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hotelops_app`;
  await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO hotelops_app`;

  console.log('Permissions granted to hotelops_app');
  
  // Show the new connection URL structure (do not print password)
  const url = new URL(connectionString!);
  url.username = 'hotelops_app';
  url.password = '<APP_DATABASE_ROLE_PASSWORD>';
  console.log('\nUpdate your .env APP_DATABASE_URL to:');
  console.log(url.toString());
}

main().catch((e: any) => {
  console.error('Failed:', e);
  process.exit(1);
});
