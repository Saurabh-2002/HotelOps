import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

import { JwtService } from '@nestjs/jwt';

describe('TASK-10 POS Transactional Descriptions (Integration)', () => {
  jest.setTimeout(60000);
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let tenant: any;
  let token: string;
  let room: any;
  let bookingId: string;
  let menuItemId: string;
  let orderId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Setup data
    const ts = Date.now().toString();
    const email = `test10-${ts}@tenant.com`;
    await prisma.withBypassRls(async (tx) => {
      tenant = await tx.tenant.create({ data: { name: `T10-${ts}` } });
      room = await tx.room.create({
        data: { tenantId: tenant.id, roomNumber: `R-${ts}`, legacyType: 'DLX', baseRate: 1000 }
      });
      const booking = await tx.booking.create({
        data: { tenantId: tenant.id, roomId: room.id, status: 'CHECKED_IN', checkInDate: new Date(), checkOutDate: new Date(Date.now() + 86400000) }
      });
      bookingId = booking.id;
      
      const item = await tx.menuItem.create({
        data: { tenantId: tenant.id, name: 'Original Burger', category: 'Food', price: 150 }
      });
      menuItemId = item.id;
    });

    token = jwtService.sign({ sub: 'user1', email, role: 'OWNER', tenantId: tenant.id });
  });

  afterAll(async () => {
    await prisma.withBypassRls(async (tx) => {
      await tx.posOrderItem.deleteMany({ where: { order: { tenantId: tenant.id } } });
      await tx.posOrder.deleteMany({ where: { tenantId: tenant.id } });
      await tx.folio.deleteMany({ where: { tenantId: tenant.id } });
      await tx.booking.deleteMany({ where: { tenantId: tenant.id } });
      await tx.menuItem.deleteMany({ where: { tenantId: tenant.id } });
      await tx.room.deleteMany({ where: { tenantId: tenant.id } });
      await tx.user.deleteMany({ where: { tenantId: tenant.id } });
      await tx.tenant.delete({ where: { id: tenant.id } });
    });
    await app.close();
  });

  it('1. Persists itemName and unitPrice at order creation', async () => {
    const res = await request(app.getHttpServer())
      .post('/pos/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bookingId,
        items: [{ menuItemId, quantity: 2 }]
      })
      .expect(201);
    
    orderId = res.body.id;
    
    // Post to room
    await request(app.getHttpServer())
      .post(`/pos/orders/${orderId}/settle`)
      .set('Authorization', `Bearer ${token}`)
      .send({ method: 'ROOM_POST', bookingId })
      .expect(201);
    
    // Verify DB
    await prisma.withTenant(tenant.id, async (tx) => {
      const order = await tx.posOrder.findUnique({ where: { id: orderId }, include: { items: true } });
      expect(order!.items[0].itemName).toBe('Original Burger');
      expect(Number(order!.items[0].unitPrice)).toBe(150);
    });
  });

  it('2. OPEN invoice generation uses transactional name and price', async () => {
    const res = await request(app.getHttpServer())
      .post(`/billing/invoice/${bookingId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
      
    const posOrder = res.body.breakdown.posOrders.find((o: any) => o.id === orderId);
    expect(posOrder.items[0].menuItem.name).toBe('Original Burger');
    expect(posOrder.items[0].unitPrice).toBe(150);
  });

  it('3. Mutation of MenuItem does not affect OPEN invoice', async () => {
    // Mutate MenuItem
    await prisma.withTenant(tenant.id, async (tx) => {
      await tx.menuItem.update({
        where: { id: menuItemId },
        data: { name: 'Changed Burger', price: 999 }
      });
    });

    const res = await request(app.getHttpServer())
      .post(`/billing/invoice/${bookingId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
      
    const posOrder = res.body.breakdown.posOrders.find((o: any) => o.id === orderId);
    expect(posOrder.items[0].menuItem.name).toBe('Original Burger');
    expect(posOrder.items[0].unitPrice).toBe(150);
  });

  it('4. Settlement snapshots freeze transactional values and post-settlement mutation does not alter snapshot', async () => {
    // Settle folio
    const settleRes = await request(app.getHttpServer())
      .post(`/billing/folio/${bookingId}/settle`)
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentMethod: 'CREDIT_CARD' })
      .expect(201);

    expect(settleRes.body.status).toBe('SETTLED');
    const folioId = settleRes.body.id;
    
    // Mutate again
    await prisma.withTenant(tenant.id, async (tx) => {
      await tx.menuItem.update({
        where: { id: menuItemId },
        data: { name: 'Post-Settle Burger', price: 50 }
      });
    });

    // Fetch snapshot
    const fetchRes = await request(app.getHttpServer())
      .get(`/billing/folio/${folioId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const snapshot = fetchRes.body.invoiceSnapshot;
    const posOrder = snapshot.posOrders.find((o: any) => o.id === orderId);
    expect(posOrder.items[0].menuItem.name).toBe('Original Burger');
    expect(posOrder.items[0].unitPrice).toBe(150);
  });
});

