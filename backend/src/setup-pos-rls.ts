/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();

const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('ERROR: DATABASE_URL is not set.');
  process.exit(1);
}

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  console.log('Setting up RLS policies for POS tables...');

  const sql = async (strings: any, ...values: any[]) => {
    try {
      const query = typeof strings === 'string' ? strings : strings.reduce((acc: string, str: string, i: number) => acc + str + (values[i] || ''), '');
      await client.query(query);
    } catch (e: any) {
      if (e.message && e.message.includes('already exists')) {
        console.log('Policy already exists, skipping.');
      } else {
        throw e;
      }
    }
  };

  // Enable RLS
  await sql`ALTER TABLE "MenuItem" ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE "PosOrder" ENABLE ROW LEVEL SECURITY`;
  
  // Note: PosOrderItem doesn't strictly need a tenantId column if we only access it through PosOrder,
  // but Prisma doesn't do complex joins for RLS automatically unless we write a custom policy.
  // Wait, I did NOT add tenantId to PosOrderItem. That means RLS on PosOrderItem needs to join PosOrder.
  // Actually, wait, let's look at schema. Prisma queries will just query PosOrderItem. 
  // Let's add tenantId to PosOrderItem to make RLS simple and standard, or write a join policy.
  // It's much safer to just add tenantId to PosOrderItem. I will update schema for PosOrderItem before running this if possible,
  // but migration already started. I'll write a join policy for PosOrderItem.
  
  await sql`ALTER TABLE "PosOrderItem" ENABLE ROW LEVEL SECURITY`;

  // Force RLS
  await sql`ALTER TABLE "MenuItem" FORCE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE "PosOrder" FORCE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE "PosOrderItem" FORCE ROW LEVEL SECURITY`;

  // Create Policies for MenuItem
  await sql`
    CREATE POLICY tenant_isolation_menuitem ON "MenuItem"
    FOR ALL
    USING (
      "tenantId" = current_setting('app.current_tenant_id', true)
      OR current_setting('app.bypass_rls', true) = 'true'
    )
    WITH CHECK (
      "tenantId" = current_setting('app.current_tenant_id', true)
      OR current_setting('app.bypass_rls', true) = 'true'
    )
  `;

  // Create Policies for PosOrder
  await sql`
    CREATE POLICY tenant_isolation_posorder ON "PosOrder"
    FOR ALL
    USING (
      "tenantId" = current_setting('app.current_tenant_id', true)
      OR current_setting('app.bypass_rls', true) = 'true'
    )
    WITH CHECK (
      "tenantId" = current_setting('app.current_tenant_id', true)
      OR current_setting('app.bypass_rls', true) = 'true'
    )
  `;

  // Create Policies for PosOrderItem (Join via PosOrder)
  await sql`
    CREATE POLICY tenant_isolation_posorderitem ON "PosOrderItem"
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM "PosOrder" po 
        WHERE po.id = "PosOrderItem"."orderId"
        AND (po."tenantId" = current_setting('app.current_tenant_id', true) OR current_setting('app.bypass_rls', true) = 'true')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM "PosOrder" po 
        WHERE po.id = "PosOrderItem"."orderId"
        AND (po."tenantId" = current_setting('app.current_tenant_id', true) OR current_setting('app.bypass_rls', true) = 'true')
      )
    )
  `;

  console.log('POS RLS policies created successfully.');
  await client.end();
}

main().catch(async (e: any) => {
  // Ignore "policy already exists" errors
  if (e.message && e.message.includes('already exists')) {
    console.log('Policies already exist.');
  } else {
    console.error('Failed:', e);
    await client.end();
    process.exit(1);
  }
});
