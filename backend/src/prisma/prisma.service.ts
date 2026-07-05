import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const DEFAULT_TRANSACTION_TIMEOUT = 15000; // 15s for Neon free-tier cold starts

function createAdapter() {
  // Use APP_DATABASE_URL (non-owner role) so Postgres enforces RLS policies.
  // Falls back to DATABASE_URL for backwards compatibility.
  const connectionString = process.env.APP_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('APP_DATABASE_URL or DATABASE_URL environment variable is not set');
  }
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  // @ts-ignore - Pool type mismatch with PrismaPg adapter
  return new PrismaPg(pool);
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ adapter: createAdapter() as any });
  }

  async onModuleInit() {
    // Warm up the connection pool on startup
    try {
      await this.$executeRawUnsafe('SELECT 1');
      console.log('Database connection established');
    } catch (e) {
      console.warn('Database warm-up query failed (will retry on first request):', (e as Error).message);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Executes a callback within a tenant-scoped transaction.
   * The SET LOCAL ensures the RLS policy variables only live within this transaction.
   * 
   * IMPORTANT: All queries inside the callback MUST use the `tx` parameter,
   * not `this` (the PrismaService instance), otherwise they run outside the transaction
   * and won't have the RLS context set.
   */
  async withTenant<T>(tenantId: string, callback: (tx: any) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      // Set RLS context for this transaction
      await tx.$executeRawUnsafe(
        `SET LOCAL app.current_tenant_id = '${tenantId}'`
      );
      await tx.$executeRawUnsafe(
        `SET LOCAL app.bypass_rls = 'false'`
      );
      return callback(tx);
    }, { maxWait: DEFAULT_TRANSACTION_TIMEOUT, timeout: DEFAULT_TRANSACTION_TIMEOUT });
  }

  /**
   * Executes a callback bypassing RLS — for super-admin operations, login lookups, etc.
   */
  async withBypassRls<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SET LOCAL app.bypass_rls = 'true'`
      );
      return callback(tx);
    }, { maxWait: DEFAULT_TRANSACTION_TIMEOUT, timeout: DEFAULT_TRANSACTION_TIMEOUT });
  }
}
