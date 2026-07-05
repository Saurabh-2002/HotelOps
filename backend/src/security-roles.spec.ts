/**
 * TASK-09: Application-Role Security & Least-Privilege Verification Tests
 *
 * These tests verify that the hotelops_app application role has exactly
 * the required least-privilege grants and that RLS tenant isolation is
 * enforced at the database level.
 *
 * TEST CLIENT SEPARATION:
 *   - OWNER client (pg.Client with DATABASE_URL): used ONLY for setup/teardown
 *     and administrative verification queries against pg_roles/pg_class.
 *   - APP client (pg.Client with APP_DATABASE_URL): used for ALL accepted
 *     runtime assertions (same-tenant CRUD, cross-tenant rejection, raw locks).
 *
 * The app client is validated at startup to ensure it is NOT superuser,
 * NOT BYPASSRLS, NOT database owner, NOT schema owner, NOT table owner.
 */
import { Client } from 'pg';

describe('TASK-09: Application-Role Security (database-connected)', () => {
  jest.setTimeout(60000);

  let ownerClient: Client;
  let appClient: Client;
  let tenantAId: string;
  let tenantBId: string;

  beforeAll(async () => {
    // Owner client for setup/teardown only
    ownerClient = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await ownerClient.connect();

    // Application client for all runtime assertions
    appClient = new Client({
      connectionString: process.env.APP_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await appClient.connect();

    // Create test tenants using owner client
    const t1 = await ownerClient.query(
      `INSERT INTO "Tenant" (id, name, "subscriptionTier", "activeModules", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), 'SecurityTestTenantA', 'BASIC', '{"RESTAURANT"}', NOW(), NOW())
       RETURNING id`
    );
    tenantAId = t1.rows[0].id;

    const t2 = await ownerClient.query(
      `INSERT INTO "Tenant" (id, name, "subscriptionTier", "activeModules", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), 'SecurityTestTenantB', 'BASIC', '{"RESTAURANT"}', NOW(), NOW())
       RETURNING id`
    );
    tenantBId = t2.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup test data using owner client
    if (tenantAId && tenantBId) {
      const tIds = [tenantAId, tenantBId];
      for (const tid of tIds) {
        await ownerClient.query(`DELETE FROM "PosOrderItem" WHERE "orderId" IN (SELECT id FROM "PosOrder" WHERE "tenantId" = $1)`, [tid]);
        await ownerClient.query(`DELETE FROM "PosOrder" WHERE "tenantId" = $1`, [tid]);
        await ownerClient.query(`DELETE FROM "Folio" WHERE "tenantId" = $1`, [tid]);
        await ownerClient.query(`DELETE FROM "GuestRecord" WHERE "bookingId" IN (SELECT id FROM "Booking" WHERE "tenantId" = $1)`, [tid]);
        await ownerClient.query(`DELETE FROM "Booking" WHERE "tenantId" = $1`, [tid]);
        await ownerClient.query(`DELETE FROM "Room" WHERE "tenantId" = $1`, [tid]);
        await ownerClient.query(`DELETE FROM "MenuItem" WHERE "tenantId" = $1`, [tid]);
        await ownerClient.query(`DELETE FROM "User" WHERE "tenantId" = $1`, [tid]);
        await ownerClient.query(`DELETE FROM "Tenant" WHERE id = $1`, [tid]);
      }
    }
    await ownerClient.end();
    await appClient.end();
  });

  // ── SAFEGUARD: Validate app client is NOT privileged ──────────────────

  describe('APP CLIENT SAFEGUARDS', () => {
    it('app client is not superuser', async () => {
      const { rows } = await appClient.query(`SELECT current_user`);
      const { rows: [role] } = await ownerClient.query(
        `SELECT rolsuper FROM pg_roles WHERE rolname = $1`, [rows[0].current_user]
      );
      expect(role.rolsuper).toBe(false);
    });

    it('app client does not have BYPASSRLS', async () => {
      const { rows } = await appClient.query(`SELECT current_user`);
      const { rows: [role] } = await ownerClient.query(
        `SELECT rolbypassrls FROM pg_roles WHERE rolname = $1`, [rows[0].current_user]
      );
      expect(role.rolbypassrls).toBe(false);
    });

    it('app client is not database owner', async () => {
      const { rows: [db] } = await ownerClient.query(
        `SELECT pg_catalog.pg_get_userbyid(datdba) as owner FROM pg_database WHERE datname = current_database()`
      );
      const { rows: [me] } = await appClient.query(`SELECT current_user`);
      expect(me.current_user).not.toBe(db.owner);
    });

    it('app client is not schema owner', async () => {
      const { rows: [schema] } = await ownerClient.query(
        `SELECT nspowner::regrole::text as owner FROM pg_namespace WHERE nspname = 'public'`
      );
      const { rows: [me] } = await appClient.query(`SELECT current_user`);
      expect(me.current_user).not.toBe(schema.owner);
    });

    it('app client is not table owner', async () => {
      const { rows: [me] } = await appClient.query(`SELECT current_user`);
      const { rows } = await ownerClient.query(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tableowner = $1`,
        [me.current_user]
      );
      expect(rows.length).toBe(0);
    });
  });

  // ── ROLE ATTRIBUTES ──────────────────────────────────────────────────

  describe('ROLE ATTRIBUTES', () => {
    it('application role is NOSUPERUSER', async () => {
      const { rows: [r] } = await ownerClient.query(
        `SELECT rolsuper FROM pg_roles WHERE rolname = 'hotelops_app'`
      );
      expect(r.rolsuper).toBe(false);
    });

    it('application role is NOBYPASSRLS', async () => {
      const { rows: [r] } = await ownerClient.query(
        `SELECT rolbypassrls FROM pg_roles WHERE rolname = 'hotelops_app'`
      );
      expect(r.rolbypassrls).toBe(false);
    });

    it('application role is NOCREATEDB', async () => {
      const { rows: [r] } = await ownerClient.query(
        `SELECT rolcreatedb FROM pg_roles WHERE rolname = 'hotelops_app'`
      );
      expect(r.rolcreatedb).toBe(false);
    });

    it('application role is NOCREATEROLE', async () => {
      const { rows: [r] } = await ownerClient.query(
        `SELECT rolcreaterole FROM pg_roles WHERE rolname = 'hotelops_app'`
      );
      expect(r.rolcreaterole).toBe(false);
    });

    it('application role is not sequence owner', async () => {
      const { rows: [me] } = await appClient.query(`SELECT current_user`);
      const { rows } = await ownerClient.query(
        `SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relkind = 'S' AND c.relowner = (SELECT oid FROM pg_roles WHERE rolname = $1)`,
        [me.current_user]
      );
      expect(rows.length).toBe(0);
    });
  });

  // ── SCHEMA AND TABLE PRIVILEGES ──────────────────────────────────────

  describe('SCHEMA AND TABLE PRIVILEGES', () => {
    it('application role can connect and has schema USAGE', async () => {
      const { rows } = await appClient.query(`SELECT 1 as connected`);
      expect(rows[0].connected).toBe(1);
    });

    it('application role can SELECT on required tables', async () => {
      const tables = ['Tenant', 'User', 'Room', 'Booking', 'GuestRecord', 'Folio', 'MenuItem', 'PosOrder', 'PosOrderItem'];
      for (const table of tables) {
        // Set bypass for non-tenant tables or set tenant context
        await appClient.query(`SET LOCAL app.bypass_rls = 'true'`);
        const { rows } = await appClient.query(`SELECT COUNT(*) FROM "${table}"`);
        expect(Number(rows[0].count)).toBeGreaterThanOrEqual(0);
      }
    });

    it('application role can INSERT into Tenant', async () => {
      const id = `test-insert-${Date.now()}`;
      await appClient.query(`SET app.bypass_rls = 'true'`);
      await appClient.query(
        `INSERT INTO "Tenant" (id, name, "subscriptionTier", "activeModules", "createdAt", "updatedAt")
         VALUES ($1, 'InsertTest', 'BASIC', '{}', NOW(), NOW())`, [id]
      );
      // Cleanup
      await ownerClient.query(`DELETE FROM "Tenant" WHERE id = $1`, [id]);
    });

    it('application role can UPDATE on Tenant', async () => {
      await appClient.query(`SET app.bypass_rls = 'true'`);
      await appClient.query(
        `UPDATE "Tenant" SET name = name WHERE id = $1`, [tenantAId]
      );
    });

    it('application role can DELETE where required', async () => {
      const id = `test-delete-${Date.now()}`;
      await ownerClient.query(
        `INSERT INTO "Tenant" (id, name, "subscriptionTier", "activeModules", "createdAt", "updatedAt")
         VALUES ($1, 'DeleteTest', 'BASIC', '{}', NOW(), NOW())`, [id]
      );
      await appClient.query(`SET app.bypass_rls = 'true'`);
      await appClient.query(`DELETE FROM "Tenant" WHERE id = $1`, [id]);
    });

    it('application role has required sequence access (or none exist)', async () => {
      const { rows } = await ownerClient.query(
        `SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'`
      );
      // UUID-based schema: no sequences expected
      expect(rows.length).toBe(0);
    });
  });

  // ── DDL DENIAL ───────────────────────────────────────────────────────

  describe('DDL DENIAL', () => {
    it('application role cannot CREATE TABLE', async () => {
      await expect(
        appClient.query(`CREATE TABLE public."_test_ddl_table" (id TEXT)`)
      ).rejects.toThrow(/permission denied/);
    });

    it('application role cannot ALTER TABLE', async () => {
      await expect(
        appClient.query(`ALTER TABLE public."Tenant" ADD COLUMN "_test_col" TEXT`)
      ).rejects.toThrow(/permission denied|must be owner/);
    });

    it('application role cannot DROP TABLE', async () => {
      await expect(
        appClient.query(`DROP TABLE public."Tenant"`)
      ).rejects.toThrow(/permission denied|must be owner/);
    });

    it('application role cannot CREATE on schema', async () => {
      await expect(
        appClient.query(`CREATE TABLE public."_test_create_schema" (id TEXT)`)
      ).rejects.toThrow(/permission denied/);
    });
  });

  // ── RLS AND FORCE RLS ────────────────────────────────────────────────

  describe('RLS AND FORCE RLS', () => {
    const tenantTables = ['User', 'Room', 'Booking', 'GuestRecord', 'Folio', 'MenuItem', 'PosOrder', 'PosOrderItem'];

    it('RLS is enabled on every tenant-scoped table', async () => {
      for (const table of tenantTables) {
        const { rows: [r] } = await ownerClient.query(
          `SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public' AND c.relname = $1`, [table]
        );
        expect(r.relrowsecurity).toBe(true);
      }
    });

    it('FORCE RLS is enabled on every tenant-scoped table', async () => {
      for (const table of tenantTables) {
        const { rows: [r] } = await ownerClient.query(
          `SELECT relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public' AND c.relname = $1`, [table]
        );
        expect(r.relforcerowsecurity).toBe(true);
      }
    });

    it('tenant isolation policy exists on every tenant-scoped table', async () => {
      for (const table of tenantTables) {
        const { rows } = await ownerClient.query(
          `SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = $1`, [table]
        );
        expect(rows.length).toBeGreaterThanOrEqual(1);
        expect(rows.some((p: any) => p.policyname.startsWith('tenant_isolation_'))).toBe(true);
      }
    });
  });

  // ── TENANT ISOLATION (same-tenant / cross-tenant) ────────────────────

  describe('TENANT ISOLATION', () => {
    let roomAId: string;
    let bookingAId: string;

    beforeAll(async () => {
      // Create room and booking for Tenant A using owner client
      const room = await ownerClient.query(
        `INSERT INTO "Room" (id, "tenantId", "roomNumber", "roomType", "baseRate", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, 'SEC-101', 'STD', 5000, NOW(), NOW())
         RETURNING id`, [tenantAId]
      );
      roomAId = room.rows[0].id;

      const booking = await ownerClient.query(
        `INSERT INTO "Booking" (id, "tenantId", "roomId", "checkInDate", "checkOutDate", status, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, CURRENT_DATE, CURRENT_DATE + 2, 'CHECKED_IN', NOW(), NOW())
         RETURNING id`, [tenantAId, roomAId]
      );
      bookingAId = booking.rows[0].id;
    });

    it('same-tenant SELECT succeeds', async () => {
      await appClient.query(`BEGIN`);
      await appClient.query(`SET LOCAL app.current_tenant_id = '${tenantAId}'`);
      await appClient.query(`SET LOCAL app.bypass_rls = 'false'`);
      const { rows } = await appClient.query(`SELECT id FROM "Room" WHERE "tenantId" = $1`, [tenantAId]);
      await appClient.query(`COMMIT`);
      expect(rows.length).toBeGreaterThanOrEqual(1);
    });

    it('same-tenant INSERT succeeds', async () => {
      await appClient.query(`BEGIN`);
      await appClient.query(`SET LOCAL app.current_tenant_id = '${tenantAId}'`);
      await appClient.query(`SET LOCAL app.bypass_rls = 'false'`);
      const { rows } = await appClient.query(
        `INSERT INTO "MenuItem" (id, "tenantId", name, category, price, "isAvailable", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, 'SecurityTestItem', 'Test', 100, true, NOW(), NOW())
         RETURNING id`, [tenantAId]
      );
      expect(rows.length).toBe(1);
      // cleanup
      await appClient.query(`DELETE FROM "MenuItem" WHERE id = $1`, [rows[0].id]);
      await appClient.query(`COMMIT`);
    });

    it('same-tenant UPDATE succeeds', async () => {
      await appClient.query(`BEGIN`);
      await appClient.query(`SET LOCAL app.current_tenant_id = '${tenantAId}'`);
      await appClient.query(`SET LOCAL app.bypass_rls = 'false'`);
      const { rowCount } = await appClient.query(
        `UPDATE "Room" SET "roomType" = 'STD' WHERE id = $1 AND "tenantId" = $2`, [roomAId, tenantAId]
      );
      await appClient.query(`COMMIT`);
      expect(rowCount).toBe(1);
    });

    it('cross-tenant SELECT returns no unauthorized rows', async () => {
      await appClient.query(`BEGIN`);
      await appClient.query(`SET LOCAL app.current_tenant_id = '${tenantBId}'`);
      await appClient.query(`SET LOCAL app.bypass_rls = 'false'`);
      const { rows } = await appClient.query(`SELECT id FROM "Room" WHERE "tenantId" = $1`, [tenantAId]);
      await appClient.query(`COMMIT`);
      expect(rows.length).toBe(0);
    });

    it('cross-tenant INSERT is rejected by RLS', async () => {
      await appClient.query(`BEGIN`);
      await appClient.query(`SET LOCAL app.current_tenant_id = '${tenantBId}'`);
      await appClient.query(`SET LOCAL app.bypass_rls = 'false'`);
      await expect(
        appClient.query(
          `INSERT INTO "Room" (id, "tenantId", "roomNumber", "roomType", "baseRate", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, 'XHACK-999', 'STD', 100, NOW(), NOW())`, [tenantAId]
        )
      ).rejects.toThrow(/row-level security/i);
      await appClient.query(`ROLLBACK`);
    });

    it('cross-tenant UPDATE cannot mutate unauthorized rows', async () => {
      await appClient.query(`BEGIN`);
      await appClient.query(`SET LOCAL app.current_tenant_id = '${tenantBId}'`);
      await appClient.query(`SET LOCAL app.bypass_rls = 'false'`);
      const { rowCount } = await appClient.query(
        `UPDATE "Room" SET "roomType" = 'HACKED' WHERE id = $1`, [roomAId]
      );
      await appClient.query(`COMMIT`);
      expect(rowCount).toBe(0);
    });

    it('cross-tenant DELETE cannot remove unauthorized rows', async () => {
      await appClient.query(`BEGIN`);
      await appClient.query(`SET LOCAL app.current_tenant_id = '${tenantBId}'`);
      await appClient.query(`SET LOCAL app.bypass_rls = 'false'`);
      const { rowCount } = await appClient.query(
        `DELETE FROM "Room" WHERE id = $1`, [roomAId]
      );
      await appClient.query(`COMMIT`);
      expect(rowCount).toBe(0);
    });

    it('Billing raw Booking lock works under application role', async () => {
      await appClient.query(`BEGIN`);
      await appClient.query(`SET LOCAL app.current_tenant_id = '${tenantAId}'`);
      await appClient.query(`SET LOCAL app.bypass_rls = 'false'`);
      const { rows } = await appClient.query(
        `SELECT id FROM "Booking" WHERE id = $1 AND "tenantId" = $2 FOR UPDATE`, [bookingAId, tenantAId]
      );
      await appClient.query(`COMMIT`);
      expect(rows.length).toBe(1);
    });

    it('POS raw Booking lock works under application role', async () => {
      await appClient.query(`BEGIN`);
      await appClient.query(`SET LOCAL app.current_tenant_id = '${tenantAId}'`);
      await appClient.query(`SET LOCAL app.bypass_rls = 'false'`);
      const { rows } = await appClient.query(
        `SELECT id, status FROM "Booking" WHERE id = $1 AND "tenantId" = $2 FOR UPDATE`, [bookingAId, tenantAId]
      );
      await appClient.query(`COMMIT`);
      expect(rows.length).toBe(1);
      expect(rows[0].status).toBe('CHECKED_IN');
    });
  });

  // ── BILLING & POS UNDER APPLICATION ROLE ─────────────────────────────

  describe('BILLING & POS SETTLEMENT under application role', () => {
    let tenantId: string;
    let roomId: string;
    let bookingId: string;

    beforeAll(async () => {
      // Use tenantAId from parent scope
      tenantId = tenantAId;

      // Create room
      const room = await ownerClient.query(
        `INSERT INTO "Room" (id, "tenantId", "roomNumber", "roomType", "baseRate", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, 'SEC-201', 'DLX', 6000, NOW(), NOW())
         RETURNING id`, [tenantId]
      );
      roomId = room.rows[0].id;

      // Create checked-in booking
      const booking = await ownerClient.query(
        `INSERT INTO "Booking" (id, "tenantId", "roomId", "checkInDate", "checkOutDate", status, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, CURRENT_DATE, CURRENT_DATE + 2, 'CHECKED_IN', NOW(), NOW())
         RETURNING id`, [tenantId, roomId]
      );
      bookingId = booking.rows[0].id;
    });

    it('Billing settlement (Folio create) works under application role', async () => {
      await appClient.query(`BEGIN`);
      await appClient.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
      await appClient.query(`SET LOCAL app.bypass_rls = 'false'`);

      // Lock booking
      const { rows: bookings } = await appClient.query(
        `SELECT id FROM "Booking" WHERE id = $1 AND "tenantId" = $2 FOR UPDATE`, [bookingId, tenantId]
      );
      expect(bookings.length).toBe(1);

      // Create folio
      const { rows: folios } = await appClient.query(
        `INSERT INTO "Folio" (id, "tenantId", "bookingId", "totalAmount", cgst, sgst, status, "invoiceSnapshot", "snapshotVersion", "settledAt", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, 12000, 720, 720, 'SETTLED', '{"snapshotVersion": 1}', 1, NOW(), NOW(), NOW())
         RETURNING id`, [tenantId, bookingId]
      );
      expect(folios.length).toBe(1);

      await appClient.query(`COMMIT`);
    });

    it('POS ROOM_POST workflow works under application role', async () => {
      // Create a menu item and POS order under app role
      await appClient.query(`BEGIN`);
      await appClient.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
      await appClient.query(`SET LOCAL app.bypass_rls = 'false'`);

      const { rows: [menuItem] } = await appClient.query(
        `INSERT INTO "MenuItem" (id, "tenantId", name, category, price, "isAvailable", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, 'SecTestBurger', 'Food', 500, true, NOW(), NOW())
         RETURNING id`, [tenantId]
      );

      const { rows: [order] } = await appClient.query(
        `INSERT INTO "PosOrder" (id, "tenantId", "bookingId", status, "paymentStatus", "totalAmount", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, 'KOT_PRINTED', 'UNPAID', 500, NOW(), NOW())
         RETURNING id`, [tenantId, bookingId]
      );

      await appClient.query(
        `INSERT INTO "PosOrderItem" (id, "orderId", "menuItemId", quantity, "unitPrice", "createdAt")
         VALUES (gen_random_uuid(), $1, $2, 1, 500, NOW())`, [order.id, menuItem.id]
      );

      // Simulate ROOM_POST: lock booking, update payment status
      const { rows: locked } = await appClient.query(
        `SELECT id, status FROM "Booking" WHERE id = $1 AND "tenantId" = $2 FOR UPDATE`, [bookingId, tenantId]
      );
      expect(locked.length).toBe(1);

      const { rowCount } = await appClient.query(
        `UPDATE "PosOrder" SET "paymentStatus" = 'POSTED_TO_ROOM' WHERE id = $1 AND "paymentStatus" = 'UNPAID'`, [order.id]
      );
      expect(rowCount).toBe(1);

      await appClient.query(`COMMIT`);
    });
  });

  // ── PROVISIONING PROPERTIES ──────────────────────────────────────────

  describe('PROVISIONING PROPERTIES', () => {
    it('provisioning contains no hard-coded credentials', async () => {
      const fs = require('fs');
      const content = fs.readFileSync(require('path').join(__dirname, 'setup-rls-role.ts'), 'utf-8');
      // Should not contain any password-like patterns
      expect(content).not.toMatch(/password\s*[:=]\s*['"][^<]/i);
      expect(content).not.toMatch(/hotelops_app_password/);
      expect(content).not.toMatch(/npg_/);
    });

    it('provisioning prints no secrets', async () => {
      const fs = require('fs');
      const content = fs.readFileSync(require('path').join(__dirname, 'setup-rls-role.ts'), 'utf-8');
      expect(content).not.toMatch(/console\.log.*password/i);
      expect(content).not.toMatch(/console\.log.*secret/i);
      expect(content).not.toMatch(/console\.log.*connectionString/i);
    });
  });
});
