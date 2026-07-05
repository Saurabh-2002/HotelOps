import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('POS Settlement Authorization Matrix', () => {
  jest.setTimeout(60000);
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let tenantId: string;
  let menuItemId: string;
  let bookingId1: string;
  let bookingIdDiffTenant: string;

  let ownerToken: string;
  let managerToken: string;
  let restaurantToken: string;
  let frontDeskToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    const ts = Date.now().toString();

    await prisma.withBypassRls(async (tx) => {
      const tenant = await tx.tenant.create({ data: { name: `AuthTenant ${ts}` } });
      tenantId = tenant.id;

      const diffTenant = await tx.tenant.create({ data: { name: `DiffTenant ${ts}` } });

      const room1 = await tx.room.create({ data: { tenantId, roomNumber: `A1-${ts}`, roomType: 'DLX', baseRate: 100 } });
      const diffRoom = await tx.room.create({ data: { tenantId: diffTenant.id, roomNumber: `B1-${ts}`, roomType: 'DLX', baseRate: 100 } });

      const b1 = await tx.booking.create({ data: { tenantId, roomId: room1.id, status: 'CHECKED_IN', checkInDate: new Date(), checkOutDate: new Date() } });
      bookingId1 = b1.id;
      
      const b2 = await tx.booking.create({ data: { tenantId: diffTenant.id, roomId: diffRoom.id, status: 'CHECKED_IN', checkInDate: new Date(), checkOutDate: new Date() } });
      bookingIdDiffTenant = b2.id;

      const m = await tx.menuItem.create({ data: { tenantId, name: 'Pizza', category: 'Food', price: 20 } });
      menuItemId = m.id;

      ownerToken = jwtService.sign({ sub: 'user1', email: 'o@t.com', role: 'OWNER', tenantId });
      managerToken = jwtService.sign({ sub: 'user2', email: 'm@t.com', role: 'MANAGER', tenantId });
      restaurantToken = jwtService.sign({ sub: 'user3', email: 'r@t.com', role: 'RESTAURANT', tenantId });
      frontDeskToken = jwtService.sign({ sub: 'user4', email: 'f@t.com', role: 'FRONT_DESK', tenantId });
    });
  });

  afterAll(async () => {
    await app.close();
  });

  async function createOrder(token: string) {
    const res = await request(app.getHttpServer())
      .post('/pos/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ menuItemId, quantity: 1 }] });
    return res.body.id;
  }

  // 1-6. OWNER, MANAGER, RESTAURANT allowed both CASH and ROOM_POST
  const authorizedRoles = [
    { role: 'OWNER', token: () => ownerToken },
    { role: 'MANAGER', token: () => managerToken },
    { role: 'RESTAURANT', token: () => restaurantToken }
  ];

  for (const { role, token } of authorizedRoles) {
    it(`[1-6] ${role} CASH allowed`, async () => {
      const orderId = await createOrder(token());
      const res = await request(app.getHttpServer())
        .post(`/pos/orders/${orderId}/settle`)
        .set('Authorization', `Bearer ${token()}`)
        .send({ method: 'CASH' });
      expect(res.status).toBe(201);
      expect(res.body.paymentStatus).toBe('PAID_CASH');
    });

    it(`[1-6] ${role} ROOM_POST allowed`, async () => {
      const orderId = await createOrder(token());
      const res = await request(app.getHttpServer())
        .post(`/pos/orders/${orderId}/settle`)
        .set('Authorization', `Bearer ${token()}`)
        .send({ method: 'ROOM_POST', bookingId: bookingId1 });
      expect(res.status).toBe(201);
      expect(res.body.paymentStatus).toBe('POSTED_TO_ROOM');
    });
  }

  // 7. FRONT_DESK CASH returns 403
  it('7. FRONT_DESK CASH returns 403', async () => {
    // Wait, FRONT_DESK cannot create POS orders (roles: OWNER, MANAGER, RESTAURANT). So we create with OWNER.
    const orderId = await createOrder(ownerToken);
    const res = await request(app.getHttpServer())
      .post(`/pos/orders/${orderId}/settle`)
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send({ method: 'CASH' });
    expect(res.status).toBe(403);
  });

  // 8. FRONT_DESK ROOM_POST allowed with valid checked-in booking
  it('8. FRONT_DESK ROOM_POST allowed with valid checked-in booking', async () => {
    const orderId = await createOrder(ownerToken);
    const res = await request(app.getHttpServer())
      .post(`/pos/orders/${orderId}/settle`)
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send({ method: 'ROOM_POST', bookingId: bookingId1 });
    expect(res.status).toBe(201);
    expect(res.body.paymentStatus).toBe('POSTED_TO_ROOM');
  });

  // 9. FRONT_DESK ROOM_POST still rejects invalid booking
  it('9. FRONT_DESK ROOM_POST still rejects invalid booking', async () => {
    const orderId = await createOrder(ownerToken);
    const res = await request(app.getHttpServer())
      .post(`/pos/orders/${orderId}/settle`)
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send({ method: 'ROOM_POST', bookingId: 'non-existent-id' });
    expect(res.status).toBe(404);
  });

  // 10. FRONT_DESK ROOM_POST still rejects cross-tenant booking
  it('10. FRONT_DESK ROOM_POST still rejects cross-tenant booking', async () => {
    const orderId = await createOrder(ownerToken);
    const res = await request(app.getHttpServer())
      .post(`/pos/orders/${orderId}/settle`)
      .set('Authorization', `Bearer ${frontDeskToken}`)
      .send({ method: 'ROOM_POST', bookingId: bookingIdDiffTenant });
    // Should be 404 because tenant isolation prevents finding the booking
    expect(res.status).toBe(404); 
  });

  // 11. Unauthenticated settlement returns 401
  it('11. Unauthenticated settlement returns 401', async () => {
    const orderId = await createOrder(ownerToken);
    const res = await request(app.getHttpServer())
      .post(`/pos/orders/${orderId}/settle`)
      .send({ method: 'CASH' });
    expect(res.status).toBe(401);
  });
});
