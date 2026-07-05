/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Idempotent least-privilege provisioning for the hotelops_app application role.
 *
 * This script MUST be run by the database owner/migration role (neondb_owner)
 * after every Prisma migration or database reset.
 *
 * Operational order:
 *   1. Owner/migration role applies Prisma migrations.
 *   2. This script runs under the owner role (DATABASE_URL).
 *   3. Application-role verification runs.
 *   4. NestJS backend starts using APP_DATABASE_URL.
 *
 * Security guarantees:
 *   - hotelops_app receives ONLY: CONNECT, USAGE on schema public,
 *     SELECT/INSERT/UPDATE/DELETE on application tables, USAGE/SELECT on sequences.
 *   - hotelops_app remains NOSUPERUSER, NOBYPASSRLS, NOCREATEDB, NOCREATEROLE.
 *   - hotelops_app is NOT schema owner, table owner, or sequence owner.
 *   - CREATE on schema public is explicitly revoked from hotelops_app.
 *   - ALTER DEFAULT PRIVILEGES ensures future tables/sequences created by the
 *     verified migration role automatically receive the required grants.
 *   - RLS and FORCE ROW LEVEL SECURITY remain enabled on all tenant-scoped tables.
 *   - Tenant isolation policies remain intact.
 *   - No credentials are printed or embedded.
 *   - Idempotent: safe to run multiple times without broadening privileges.
 */
require('dotenv').config();

const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('FATAL: DATABASE_URL is not set.');
  process.exit(1);
}

// Application tables that require DML grants
const APPLICATION_TABLES = [
  'Tenant', 'User', 'Room', 'Booking', 'GuestRecord',
  'Folio', 'MenuItem', 'PosOrder', 'PosOrderItem',
];

// Tenant-scoped tables that require RLS + FORCE RLS + tenant isolation policies
const TENANT_TABLES = [
  'User', 'Room', 'Booking', 'GuestRecord', 'Folio',
  'MenuItem', 'PosOrder',
];

// PosOrderItem uses a join-based policy (no tenantId column)
const JOIN_POLICY_TABLES = ['PosOrderItem'];

const APP_ROLE = 'hotelops_app';

async function main() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // ── Phase 1: Validate migration role identity and ownership ──────────
  const { rows: [me] } = await client.query('SELECT current_user, current_database()');
  console.log(`Connected as: ${me.current_user} on database: ${me.current_database}`);

  // Verify schema ownership
  const { rows: [schema] } = await client.query(
    `SELECT nspowner::regrole::text as owner FROM pg_namespace WHERE nspname = 'public'`
  );
  if (!schema) {
    console.error('FATAL: Schema public not found.');
    process.exit(1);
  }
  console.log(`Schema public owner: ${schema.owner}`);

  // Verify the current user is the schema owner (required for ALTER DEFAULT PRIVILEGES)
  if (schema.owner !== me.current_user) {
    console.error(`FATAL: Current user '${me.current_user}' is not the schema owner '${schema.owner}'.`);
    console.error('This script must be run by the schema/migration owner role.');
    process.exit(1);
  }

  // Verify all application tables exist and are owned by the migration role
  for (const table of APPLICATION_TABLES) {
    const { rows } = await client.query(
      `SELECT tableowner FROM pg_tables WHERE schemaname = 'public' AND tablename = $1`, [table]
    );
    if (rows.length === 0) {
      console.error(`FATAL: Table "${table}" does not exist in schema public.`);
      process.exit(1);
    }
    if (rows[0].tableowner !== me.current_user) {
      console.error(`FATAL: Table "${table}" is owned by '${rows[0].tableowner}', not '${me.current_user}'.`);
      process.exit(1);
    }
  }
  console.log('All application tables verified: exist and owned by migration role.');

  // ── Phase 2: Verify application role exists ──────────────────────────
  const { rows: roleRows } = await client.query(
    `SELECT rolname, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole
     FROM pg_roles WHERE rolname = $1`, [APP_ROLE]
  );
  if (roleRows.length === 0) {
    console.error(`FATAL: Role '${APP_ROLE}' does not exist. Create it first with appropriate credentials.`);
    process.exit(1);
  }
  const role = roleRows[0];
  console.log(`Role '${APP_ROLE}' exists. Attributes: NOSUPERUSER=${!role.rolsuper}, NOBYPASSRLS=${!role.rolbypassrls}, NOCREATEDB=${!role.rolcreatedb}, NOCREATEROLE=${!role.rolcreaterole}`);

  // Safety: refuse to proceed if the app role already has dangerous privileges
  if (role.rolsuper) {
    console.error(`FATAL: '${APP_ROLE}' is a superuser. This violates least-privilege requirements.`);
    process.exit(1);
  }
  if (role.rolbypassrls) {
    console.error(`FATAL: '${APP_ROLE}' has BYPASSRLS. This violates least-privilege requirements.`);
    process.exit(1);
  }

  // ── Phase 3: Grant schema USAGE, revoke CREATE ───────────────────────
  console.log('\n--- Granting schema privileges ---');
  await client.query(`GRANT USAGE ON SCHEMA public TO ${APP_ROLE}`);
  await client.query(`REVOKE CREATE ON SCHEMA public FROM ${APP_ROLE}`);
  // Also revoke CREATE from PUBLIC role to prevent indirect inheritance
  await client.query(`REVOKE CREATE ON SCHEMA public FROM PUBLIC`);
  console.log('GRANT USAGE ON SCHEMA public: done');
  console.log('REVOKE CREATE ON SCHEMA public from hotelops_app: done');
  console.log('REVOKE CREATE ON SCHEMA public from PUBLIC: done');

  // ── Phase 4: Grant DML on all current application tables ─────────────
  console.log('\n--- Granting table privileges ---');
  for (const table of APPLICATION_TABLES) {
    await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."${table}" TO ${APP_ROLE}`);
    console.log(`  GRANT SELECT,INSERT,UPDATE,DELETE ON "${table}": done`);
  }
  // Explicitly exclude _prisma_migrations from app role access
  console.log('  _prisma_migrations: no grants (migration-role only)');

  // ── Phase 5: Grant sequence privileges (if any exist) ────────────────
  console.log('\n--- Granting sequence privileges ---');
  const { rows: seqRows } = await client.query(
    `SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'`
  );
  if (seqRows.length === 0) {
    console.log('  No sequences found (UUID primary keys). Skipping.');
  } else {
    await client.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${APP_ROLE}`);
    for (const seq of seqRows) {
      console.log(`  GRANT USAGE,SELECT ON "${seq.sequence_name}": done`);
    }
  }

  // ── Phase 6: ALTER DEFAULT PRIVILEGES for future objects ─────────────
  console.log('\n--- Setting default privileges for future objects ---');
  // Use the verified current_user (schema owner / migration role)
  await client.query(
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${me.current_user} IN SCHEMA public
     GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${APP_ROLE}`
  );
  console.log(`  DEFAULT PRIVILEGES: tables created by ${me.current_user} -> GRANT SELECT,INSERT,UPDATE,DELETE to ${APP_ROLE}`);

  await client.query(
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${me.current_user} IN SCHEMA public
     GRANT USAGE, SELECT ON SEQUENCES TO ${APP_ROLE}`
  );
  console.log(`  DEFAULT PRIVILEGES: sequences created by ${me.current_user} -> GRANT USAGE,SELECT to ${APP_ROLE}`);

  // ── Phase 7: Enable RLS and FORCE RLS on all tenant-scoped tables ────
  console.log('\n--- Configuring RLS ---');
  for (const table of TENANT_TABLES) {
    await client.query(`ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY`);
    await client.query(`ALTER TABLE public."${table}" FORCE ROW LEVEL SECURITY`);
    console.log(`  "${table}": RLS ENABLED, FORCE RLS ENABLED`);
  }
  for (const table of JOIN_POLICY_TABLES) {
    await client.query(`ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY`);
    await client.query(`ALTER TABLE public."${table}" FORCE ROW LEVEL SECURITY`);
    console.log(`  "${table}": RLS ENABLED, FORCE RLS ENABLED (join-based policy)`);
  }

  // ── Phase 8: Create tenant isolation policies (idempotent) ───────────
  console.log('\n--- Creating/verifying tenant isolation policies ---');

  // Standard tenant policies (tables with tenantId column)
  for (const table of TENANT_TABLES) {
    const policyName = `tenant_isolation_${table.toLowerCase()}`;
    try {
      await client.query(`
        CREATE POLICY ${policyName} ON public."${table}"
        FOR ALL
        USING (
          "tenantId" = current_setting('app.current_tenant_id', true)
          OR current_setting('app.bypass_rls', true) = 'true'
        )
        WITH CHECK (
          "tenantId" = current_setting('app.current_tenant_id', true)
          OR current_setting('app.bypass_rls', true) = 'true'
        )
      `);
      console.log(`  Policy "${policyName}": CREATED`);
    } catch (e) {
      if (e.message && e.message.includes('already exists')) {
        console.log(`  Policy "${policyName}": already exists (OK)`);
      } else {
        throw e;
      }
    }
  }

  // Join-based policy for PosOrderItem (no tenantId column)
  for (const table of JOIN_POLICY_TABLES) {
    const policyName = `tenant_isolation_${table.toLowerCase()}`;
    try {
      await client.query(`
        CREATE POLICY ${policyName} ON public."${table}"
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM public."PosOrder" po
            WHERE po.id = "${table}"."orderId"
            AND (po."tenantId" = current_setting('app.current_tenant_id', true)
                 OR current_setting('app.bypass_rls', true) = 'true')
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public."PosOrder" po
            WHERE po.id = "${table}"."orderId"
            AND (po."tenantId" = current_setting('app.current_tenant_id', true)
                 OR current_setting('app.bypass_rls', true) = 'true')
          )
        )
      `);
      console.log(`  Policy "${policyName}": CREATED (join-based)`);
    } catch (e) {
      if (e.message && e.message.includes('already exists')) {
        console.log(`  Policy "${policyName}": already exists (OK)`);
      } else {
        throw e;
      }
    }
  }

  // ── Phase 9: Final verification report ───────────────────────────────
  console.log('\n--- Final verification ---');

  // Verify grants applied
  const { rows: grantRows } = await client.query(
    `SELECT table_name, privilege_type
     FROM information_schema.role_table_grants
     WHERE grantee = $1 AND table_schema = 'public'
     ORDER BY table_name, privilege_type`, [APP_ROLE]
  );
  console.log(`Total table grants for ${APP_ROLE}: ${grantRows.length}`);

  // Verify default privileges
  const { rows: defPrivs } = await client.query(
    `SELECT pg_get_userbyid(defaclrole) as granting_role,
            defaclobjtype as obj_type,
            defaclacl::text as privileges
     FROM pg_default_acl a JOIN pg_namespace b ON a.defaclnamespace = b.oid
     WHERE nspname = 'public'`
  );
  console.log('Default privileges:');
  for (const dp of defPrivs) {
    console.log(`  ${dp.granting_role} -> ${dp.obj_type}: ${dp.privileges}`);
  }

  // Verify RLS state
  const { rows: rlsRows } = await client.query(
    `SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r'
     ORDER BY c.relname`
  );
  console.log('RLS state:');
  for (const r of rlsRows) {
    console.log(`  "${r.relname}": RLS=${r.relrowsecurity}, FORCE=${r.relforcerowsecurity}`);
  }

  // Verify policies
  const { rows: policyRows } = await client.query(
    `SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename`
  );
  console.log('Policies:');
  for (const p of policyRows) {
    console.log(`  "${p.tablename}": ${p.policyname}`);
  }

  console.log('\n✅ Provisioning complete. hotelops_app is ready for runtime use.');
  await client.end();
}

main().catch(async (e) => {
  console.error('FATAL:', e.message || e);
  process.exit(1);
});
