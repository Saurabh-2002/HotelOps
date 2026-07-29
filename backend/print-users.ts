import { Client } from 'pg';

const connectionString = "postgresql://neondb_owner:npg_WlPq1G7FeAvK@ep-delicate-firefly-at8vgq2f-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function main() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  await client.query('UPDATE "User" SET role = \'MANAGER\' WHERE email = \'jane@hotelops.com\'');
  await client.query('UPDATE "User" SET role = \'RESTAURANT\' WHERE email = \'john@hotelops.in\'');
  
  const res = await client.query('SELECT * FROM "User"');
  console.log(res.rows);

  await client.end();
}
main();
