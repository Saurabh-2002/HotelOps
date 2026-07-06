import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

describe('TASK-03 Billing & Settlement Integration (e2e)', () => {
  jest.setTimeout(60000);
  let app: INestApplication;
  let prisma: PrismaService;
  let tenant1: any;
  let tenant2: any;
  let token1: string;
  let token2: string;
  let email1: string;
  let email2: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.withBypassRls(async (tx) => {
      tenant1 = await tx.tenant.create({ data: { name: 'Tenant A', activeModules: ['RESTAURANT', 'HOUSEKEEPING'] } });
      tenant2 = await tx.tenant.create({ data: { name: 'Tenant B', activeModules: ['RESTAURANT', 'HOUSEKEEPING'] } });

      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('pwd', 10);
      const ts = Date.now().toString() + Math.random().toString(36).substring(7);
      email1 = `t1_${ts}@b.com`;
      email2 = `t2_${ts}@b.com`;
      await tx.user.create({ data: { tenantId: tenant1.id, name: 'T1', email: email1, hashedPassword, role: 'FRONT_DESK' } });
      await tx.user.create({ data: { tenantId: tenant2.id, name: 'T2', email: email2, hashedPassword, role: 'FRONT_DESK' } });
    });

    const res1 = await request(app.getHttpServer()).post('/api/auth/login').send({ email: email1, password: 'pwd' });
    const res2 = await request(app.getHttpServer()).post('/api/auth/login').send({ email: email2, password: 'pwd' });
    token1 = res1.body.access_token;
    token2 = res2.body.access_token;
  });

  afterAll(async () => {
    await prisma.withBypassRls(async (tx) => {
      const tIds = [tenant1.id, tenant2.id];
      await tx.posOrderItem.deleteMany({ where: { order: { tenantId: { in: tIds } } } });
      await tx.posOrder.deleteMany({ where: { tenantId: { in: tIds } } });
      await tx.folio.deleteMany({ where: { tenantId: { in: tIds } } });
      await tx.guestRecord.deleteMany({ where: { booking: { tenantId: { in: tIds } } } });
      await tx.booking.deleteMany({ where: { tenantId: { in: tIds } } });
      await tx.room.deleteMany({ where: { tenantId: { in: tIds } } });
      await tx.menuItem.deleteMany({ where: { tenantId: { in: tIds } } });
      await tx.user.deleteMany({ where: { tenantId: { in: tIds } } });
      await tx.tenant.deleteMany({ where: { id: { in: tIds } } });
    });
    await app.close();
  });

  let room1: any;
  let booking1: any;

  beforeEach(async () => {
    await prisma.withBypassRls(async (tx) => {
      const tIds = [tenant1.id, tenant2.id];
      await tx.posOrderItem.deleteMany({ where: { order: { tenantId: { in: tIds } } } });
      await tx.posOrder.deleteMany({ where: { tenantId: { in: tIds } } });
      await tx.folio.deleteMany({ where: { tenantId: { in: tIds } } });
      await tx.guestRecord.deleteMany({ where: { booking: { tenantId: { in: tIds } } } });
      await tx.booking.deleteMany({ where: { tenantId: { in: tIds } } });
      await tx.room.deleteMany({ where: { tenantId: { in: tIds } } });
      await tx.menuItem.deleteMany({ where: { tenantId: { in: tIds } } });

      room1 = await tx.room.create({ data: { tenantId: tenant1.id, roomNumber: '101', roomType: 'STD', baseRate: 5000 } });
      
      const d1 = new Date();
      const d2 = new Date();
      d2.setDate(d2.getDate() + 2);
      booking1 = await tx.booking.create({
        data: { tenantId: tenant1.id, roomId: room1.id, checkInDate: d1, checkOutDate: d2, status: 'CHECKED_IN' }
      });
    });
  });

  describe('CALCULATION & OPEN FOLIO (1-20)', () => {
    it('Calculates room-only stay deterministically', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/billing/invoice/${booking1.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(201);
      
      const { breakdown, folio } = res.body;
      expect(folio.status).toBe('OPEN');
      expect(breakdown.nights).toBe(2);
      expect(breakdown.totalRoomCharge).toBe(10000);
      expect(breakdown.roomCgst).toBe(600);
      expect(breakdown.roomSgst).toBe(600);
      expect(breakdown.grandTotal).toBe(11200);
    });

    it('Dynamically includes POSTED_TO_ROOM orders, excludes UNPAID and CASH', async () => {
      await prisma.withBypassRls(async (tx) => {
        const item = await tx.menuItem.create({ data: { tenantId: tenant1.id, name: 'Burger', category: 'Food', price: 1000 } });
        await tx.posOrder.create({ data: { tenantId: tenant1.id, bookingId: booking1.id, paymentStatus: 'POSTED_TO_ROOM', status: 'BILLED', totalAmount: 1000 } });
        await tx.posOrder.create({ data: { tenantId: tenant1.id, bookingId: booking1.id, paymentStatus: 'UNPAID', status: 'KOT_PRINTED', totalAmount: 2000 } });
        await tx.posOrder.create({ data: { tenantId: tenant1.id, bookingId: booking1.id, paymentStatus: 'PAID_CASH', status: 'BILLED', totalAmount: 3000 } });
      });

      const res = await request(app.getHttpServer())
        .post(`/api/billing/invoice/${booking1.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(201);
      
      const { breakdown, folio } = res.body;
      expect(breakdown.totalPosCharge).toBe(1000);
      expect(breakdown.posCgst).toBe(25);
      expect(breakdown.posSgst).toBe(25);
      expect(breakdown.grandTotal).toBe(12250);
      expect(folio.totalAmount).toBe(12250);

      const dbFolios = await prisma.folio.findMany();
      expect(dbFolios.length).toBe(0);
    });
  });

  describe('SETTLEMENT & IMMUTABILITY (21-33)', () => {
    it('Settles folio, freezes totals in JSON snapshot', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/billing/folio/OPEN-${booking1.id}/settle`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(201);
      
      expect(res.body.status).toBe('SETTLED');
      expect(res.body.snapshotVersion).toBe(1);
      expect(res.body.invoiceSnapshot).toBeDefined();

      const dbFolios = await prisma.withBypassRls(tx => tx.folio.findMany({ where: { tenantId: tenant1.id } }));
      expect(dbFolios.length).toBe(1);
      expect(dbFolios[0].status).toBe('SETTLED');

      const res2 = await request(app.getHttpServer())
        .post(`/api/billing/invoice/${booking1.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(201);
      
      expect(res2.body.folio.id).toBe(dbFolios[0].id);

      await prisma.withBypassRls(async (tx) => {
        await tx.posOrder.create({
          data: { tenantId: tenant1.id, bookingId: booking1.id, paymentStatus: 'POSTED_TO_ROOM', status: 'BILLED', totalAmount: 5000 }
        });
        await tx.room.update({
          where: { id: room1.id },
          data: { baseRate: 9999 }
        });
      });

      const res3 = await request(app.getHttpServer())
        .post(`/api/billing/invoice/${booking1.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(201);
      
      expect(res3.body.breakdown.grandTotal).toBe(11200); 
      expect(res3.body.breakdown.roomRate).toBe(5000); 
    });

    it('Returns 409 Conflict on sequential duplicate settlement', async () => {
      await request(app.getHttpServer())
        .post(`/api/billing/folio/OPEN-${booking1.id}/settle`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/billing/folio/OPEN-${booking1.id}/settle`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(409);
    });

    it('Rejects ROOM_POST after Folio is SETTLED', async () => {
      await request(app.getHttpServer())
        .post(`/api/billing/folio/OPEN-${booking1.id}/settle`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(201);

      let order: any;
      await prisma.withBypassRls(async (tx) => {
        order = await tx.posOrder.create({
          data: { tenantId: tenant1.id, paymentStatus: 'UNPAID', status: 'KOT_PRINTED', totalAmount: 100 }
        });
      });

      await request(app.getHttpServer())
        .post(`/api/pos/orders/${order.id}/settle`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ method: 'ROOM_POST', bookingId: booking1.id })
        .expect(409);
    });

    it('Fails explicitly on legacy missing snapshot', async () => {
      await prisma.withBypassRls(async (tx) => {
        await tx.folio.create({
          data: { tenantId: tenant1.id, bookingId: booking1.id, totalAmount: 11200, status: 'SETTLED' }
        });
      });

      await request(app.getHttpServer())
        .post(`/api/billing/invoice/${booking1.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(409); 
    });
  });

  describe('SECURITY & TENANT ISOLATION (34-40)', () => {
    it('Rejects cross-tenant invoice calculation', async () => {
      await request(app.getHttpServer())
        .post(`/api/billing/invoice/${booking1.id}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(404);
    });
  });
});
