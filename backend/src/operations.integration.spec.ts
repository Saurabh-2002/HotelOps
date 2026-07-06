import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Phase 1-2 Operations End-to-End (e2e)', () => {
  jest.setTimeout(30000); // 30 seconds timeout
  
  let app: INestApplication;
  let prisma: PrismaService;
  
  // Test Data
  let tenantA: any;
  let tenantB: any;
  let ownerTokenA: string;
  let frontDeskTokenA: string;
  let ownerTokenB: string;
  let roomA: any;
  let menuItemA: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    prisma = app.get<PrismaService>(PrismaService);
    
    // Clear and Setup Data
    await prisma.withBypassRls(async (tx) => {
      // Due to relation constraints, we delete in order or let Prisma handle cascade if enabled.
      // Easiest is to delete tenants which will cascade if schema allows, otherwise delete children first.
      await tx.posOrderItem.deleteMany();
      await tx.posOrder.deleteMany();
      await tx.folio.deleteMany();
      await tx.guestRecord.deleteMany();
      await tx.booking.deleteMany();
      await tx.user.deleteMany();
      await tx.menuItem.deleteMany();
      await tx.room.deleteMany();
      await tx.tenant.deleteMany();
    });
    
    // Create Tenants, Users, Rooms inside Bypass RLS
    await prisma.withBypassRls(async (tx) => {
      tenantA = await tx.tenant.create({ data: { name: 'Hotel A' } });
      tenantB = await tx.tenant.create({ data: { name: 'Hotel B' } });
      
      const ownerA = await tx.user.create({
        data: { tenantId: tenantA.id, name: 'Owner A', email: 'ownerA@test.com', hashedPassword: 'hash', role: 'OWNER' }
      });
      const fdA = await tx.user.create({
        data: { tenantId: tenantA.id, name: 'FD A', email: 'fdA@test.com', hashedPassword: 'hash', role: 'FRONT_DESK' }
      });
      const ownerB = await tx.user.create({
        data: { tenantId: tenantB.id, name: 'Owner B', email: 'ownerB@test.com', hashedPassword: 'hash', role: 'OWNER' }
      });
      
      // Mock JWT Tokens (Simulate Auth)
      const jwtService = app.get(JwtService);
      ownerTokenA = jwtService.sign({ sub: ownerA.id, email: ownerA.email, role: ownerA.role, tenantId: tenantA.id });
      frontDeskTokenA = jwtService.sign({ sub: fdA.id, email: fdA.email, role: fdA.role, tenantId: tenantA.id });
      ownerTokenB = jwtService.sign({ sub: ownerB.id, email: ownerB.email, role: ownerB.role, tenantId: tenantB.id });
      
      roomA = await tx.room.create({
        data: { tenantId: tenantA.id, roomNumber: '101', roomType: 'DELUXE', baseRate: 5000 }
      });
  
      menuItemA = await tx.menuItem.create({
        data: { tenantId: tenantA.id, name: 'Pizza', category: 'Food', price: 500 }
      });
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('SCENARIO A — ROOM-ONLY STAY', () => {
    let bookingId: string;
    let folioId: string;

    it('creates reservation & checks in', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${frontDeskTokenA}`)
        .send({
          roomId: roomA.id,
          checkInDate: new Date().toISOString(),
          checkOutDate: new Date(Date.now() + 86400000).toISOString(), // 1 night
          guests: [{ fullName: 'John Doe', idType: 'Passport', idNumber: 'AB123' }]
        })
        .expect(201);
      
      bookingId = res.body.id;

      await request(app.getHttpServer())
        .post(`/bookings/${bookingId}/check-in`)
        .set('Authorization', `Bearer ${frontDeskTokenA}`)
        .expect(201);
    });

    it('attempts checkout before settlement (blocked)', async () => {
      await request(app.getHttpServer())
        .post(`/bookings/${bookingId}/check-out`)
        .set('Authorization', `Bearer ${frontDeskTokenA}`)
        .expect(409) // Conflict
        .expect((res) => {
          expect(res.body.message).toContain('unsettled account');
        });
    });

    it('generates dynamic folio and settles it', async () => {
      const invoiceRes = await request(app.getHttpServer())
        .post(`/billing/invoice/${bookingId}`)
        .set('Authorization', `Bearer ${frontDeskTokenA}`)
        .expect(201);
      
      const dynamicFolioId = invoiceRes.body.folio.id; // 'OPEN-...'

      const settleRes = await request(app.getHttpServer())
        .post(`/billing/folio/${dynamicFolioId}/settle`)
        .set('Authorization', `Bearer ${frontDeskTokenA}`)
        .expect(201);
      
      folioId = settleRes.body.id;
      expect(settleRes.body.status).toBe('SETTLED');
    });

    it('successfully checks out', async () => {
      await request(app.getHttpServer())
        .post(`/bookings/${bookingId}/check-out`)
        .set('Authorization', `Bearer ${frontDeskTokenA}`)
        .expect(201);
    });
  });

  describe('SCENARIO B — ROOM + MULTIPLE RESTAURANT ORDERS', () => {
    let bookingId: string;
    let dynamicFolioId: string;

    it('creates reservation & checks in', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${frontDeskTokenA}`)
        .send({
          roomId: roomA.id,
          checkInDate: new Date().toISOString(),
          checkOutDate: new Date(Date.now() + 86400000).toISOString(),
          guests: [{ fullName: 'Jane Doe', idType: 'PAN', idNumber: 'PA123' }]
        })
        .expect(201);
      
      bookingId = res.body.id;
      await request(app.getHttpServer())
        .post(`/bookings/${bookingId}/check-in`)
        .set('Authorization', `Bearer ${frontDeskTokenA}`)
        .expect(201);
    });

    it('posts first restaurant order to room', async () => {
      const orderRes = await request(app.getHttpServer())
        .post('/pos/orders')
        .set('Authorization', `Bearer ${ownerTokenA}`)
        .send({
          items: [{ menuItemId: menuItemA.id, quantity: 2 }]
        })
        .expect(201);
      
      await request(app.getHttpServer())
        .post(`/pos/orders/${orderRes.body.id}/settle`)
        .set('Authorization', `Bearer ${ownerTokenA}`)
        .send({ method: 'ROOM_POST', bookingId })
        .expect(201);
    });

    it('verifies order appears on folio', async () => {
      const invoiceRes = await request(app.getHttpServer())
        .post(`/billing/invoice/${bookingId}`)
        .set('Authorization', `Bearer ${frontDeskTokenA}`)
        .expect(201);
      
      dynamicFolioId = invoiceRes.body.folio.id;
      expect(invoiceRes.body.breakdown.posOrders.length).toBe(1);
      expect(Number(invoiceRes.body.breakdown.totalPosCharge)).toBe(1000); // 2 * 500
    });

    it('posts second order and refreshes folio', async () => {
      const orderRes = await request(app.getHttpServer())
        .post('/pos/orders')
        .set('Authorization', `Bearer ${ownerTokenA}`)
        .send({
          items: [{ menuItemId: menuItemA.id, quantity: 1 }]
        })
        .expect(201);
      
      await request(app.getHttpServer())
        .post(`/pos/orders/${orderRes.body.id}/settle`)
        .set('Authorization', `Bearer ${ownerTokenA}`)
        .send({ method: 'ROOM_POST', bookingId })
        .expect(201);

      const invoiceRes = await request(app.getHttpServer())
        .post(`/billing/invoice/${bookingId}`)
        .set('Authorization', `Bearer ${frontDeskTokenA}`)
        .expect(201);
      
      expect(invoiceRes.body.breakdown.posOrders.length).toBe(2);
      expect(Number(invoiceRes.body.breakdown.totalPosCharge)).toBe(1500);
    });

    it('settles folio', async () => {
      await request(app.getHttpServer())
        .post(`/billing/folio/${dynamicFolioId}/settle`)
        .set('Authorization', `Bearer ${frontDeskTokenA}`)
        .expect(201);
    });

    it('blocks another ROOM_POST after folio is settled', async () => {
      const orderRes = await request(app.getHttpServer())
        .post('/pos/orders')
        .set('Authorization', `Bearer ${ownerTokenA}`)
        .send({
          items: [{ menuItemId: menuItemA.id, quantity: 1 }]
        })
        .expect(201);
      
      await request(app.getHttpServer())
        .post(`/pos/orders/${orderRes.body.id}/settle`)
        .set('Authorization', `Bearer ${ownerTokenA}`)
        .send({ method: 'ROOM_POST', bookingId })
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('already SETTLED');
        });
    });

    it('successfully checks out', async () => {
      await request(app.getHttpServer())
        .post(`/bookings/${bookingId}/check-out`)
        .set('Authorization', `Bearer ${frontDeskTokenA}`)
        .expect(201);
    });
  });

  describe('SCENARIO C — CASH RESTAURANT ORDER', () => {
    it('creates KOT and settles CASH without room liability', async () => {
      const orderRes = await request(app.getHttpServer())
        .post('/pos/orders')
        .set('Authorization', `Bearer ${ownerTokenA}`)
        .send({
          items: [{ menuItemId: menuItemA.id, quantity: 1 }]
        })
        .expect(201);
      
      await request(app.getHttpServer())
        .post(`/pos/orders/${orderRes.body.id}/settle`)
        .set('Authorization', `Bearer ${ownerTokenA}`)
        .send({ method: 'CASH' })
        .expect(201)
        .expect((res) => {
          expect(res.body.paymentStatus).toBe('PAID_CASH');
        });
    });
  });

  describe('SCENARIO D — OPERATIONAL CONFLICTS', () => {
    it('prevents checkout with UNPAID pos order', async () => {
      // 1. Create booking
      const bRes = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${ownerTokenA}`)
        .send({
          roomId: roomA.id,
          checkInDate: new Date().toISOString(),
          checkOutDate: new Date(Date.now() + 86400000).toISOString(),
          guests: [{ fullName: 'Test', idType: 'PAN', idNumber: '123' }]
        });
      const bId = bRes.body.id;
      await request(app.getHttpServer()).post(`/bookings/${bId}/check-in`).set('Authorization', `Bearer ${ownerTokenA}`);

      // 2. Create Unpaid order attached to booking
      await request(app.getHttpServer())
        .post('/pos/orders')
        .set('Authorization', `Bearer ${ownerTokenA}`)
        .send({
          bookingId: bId,
          items: [{ menuItemId: menuItemA.id, quantity: 1 }]
        });

      // 3. Attempt checkout (should fail)
      await request(app.getHttpServer())
        .post(`/bookings/${bId}/check-out`)
        .set('Authorization', `Bearer ${ownerTokenA}`)
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('UNPAID POS orders');
        });
    });
  });

  describe('SCENARIO E — TENANT ISOLATION', () => {
    it('prevents Tenant B from accessing Tenant A rooms', async () => {
      await request(app.getHttpServer())
        .get('/rooms')
        .set('Authorization', `Bearer ${ownerTokenB}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.length).toBe(0); // Tenant B has no rooms
        });
    });
  });
});
