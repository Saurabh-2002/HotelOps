import { Test, TestingModule } from '@nestjs/testing';
import { PosService } from './pos.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppModule } from '../app.module';
import { PosSettlementMethod } from './dto/pos.dto';
import { ConflictException } from '@nestjs/common';

describe('POS Settlement Concurrency Reproduction', () => {
  jest.setTimeout(60000);
  let service: PosService;
  let prisma: PrismaService;

  let tenantId: string;
  let menuItemId: string;
  let bookingId1: string;
  let bookingId2: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = module.get<PosService>(PosService);
    prisma = module.get<PrismaService>(PrismaService);

    const ts = Date.now().toString();
    await prisma.withBypassRls(async (tx) => {
      const tenant = await tx.tenant.create({ data: { name: `Tenant ${ts}` } });
      tenantId = tenant.id;

      const room1 = await tx.room.create({ data: { tenantId, roomNumber: `R1-${ts}`, roomType: 'DLX', baseRate: 100 } });
      const room2 = await tx.room.create({ data: { tenantId, roomNumber: `R2-${ts}`, roomType: 'DLX', baseRate: 100 } });

      const b1 = await tx.booking.create({ data: { tenantId, roomId: room1.id, status: 'CHECKED_IN', checkInDate: new Date(), checkOutDate: new Date() } });
      bookingId1 = b1.id;
      const b2 = await tx.booking.create({ data: { tenantId, roomId: room2.id, status: 'CHECKED_IN', checkInDate: new Date(), checkOutDate: new Date() } });
      bookingId2 = b2.id;

      const m = await tx.menuItem.create({ data: { tenantId, name: 'Burger', category: 'Food', price: 10 } });
      menuItemId = m.id;
    });
  });

  afterAll(async () => {
    await prisma.withBypassRls(async (tx) => {
      await tx.posOrderItem.deleteMany({ where: { order: { tenantId } } });
      await tx.posOrder.deleteMany({ where: { tenantId } });
      await tx.menuItem.deleteMany({ where: { tenantId } });
      await tx.booking.deleteMany({ where: { tenantId } });
      await tx.room.deleteMany({ where: { tenantId } });
      await tx.tenant.deleteMany({ where: { id: tenantId } });
    });
  });

  async function createOrder() {
    return service.createOrder(tenantId, { items: [{ menuItemId, quantity: 1 }] });
  }

  it('1. Two concurrent CASH requests against one UNPAID order', async () => {
    const order = await createOrder();
    
    // Fire concurrently
    const results = await Promise.allSettled([
      service.settleOrder(tenantId, order.id, { method: PosSettlementMethod.CASH }),
      service.settleOrder(tenantId, order.id, { method: PosSettlementMethod.CASH })
    ]);

    const successes = results.filter(r => r.status === 'fulfilled').length;
    const rejections = results.filter(r => r.status === 'rejected').length;

    const finalOrder = await prisma.withBypassRls(tx => tx.posOrder.findUnique({ where: { id: order.id } }));
    console.log(`Scenario 1 (CASH vs CASH): successes=${successes}, rejections=${rejections}, finalStatus=${finalOrder?.paymentStatus}`);
    expect(successes).toBe(1);
    expect(rejections).toBe(1);
    expect(finalOrder?.paymentStatus).toBe('PAID_CASH');
  });

  it('2. Two concurrent ROOM_POST requests against same booking', async () => {
    const order = await createOrder();
    
    const results = await Promise.allSettled([
      service.settleOrder(tenantId, order.id, { method: PosSettlementMethod.ROOM_POST, bookingId: bookingId1 }),
      service.settleOrder(tenantId, order.id, { method: PosSettlementMethod.ROOM_POST, bookingId: bookingId1 })
    ]);

    const successes = results.filter(r => r.status === 'fulfilled').length;
    const rejections = results.filter(r => r.status === 'rejected').length;

    const finalOrder = await prisma.withBypassRls(tx => tx.posOrder.findUnique({ where: { id: order.id } }));
    console.log(`Scenario 2 (ROOM_POST vs ROOM_POST same): successes=${successes}, rejections=${rejections}, finalStatus=${finalOrder?.paymentStatus}, finalBooking=${finalOrder?.bookingId}`);
    expect(successes).toBe(1);
    expect(rejections).toBe(1);
    expect(finalOrder?.paymentStatus).toBe('POSTED_TO_ROOM');
    expect(finalOrder?.bookingId).toBe(bookingId1);
  });

  it('3. Two concurrent ROOM_POST requests against different bookings', async () => {
    const order = await createOrder();
    
    const results = await Promise.allSettled([
      service.settleOrder(tenantId, order.id, { method: PosSettlementMethod.ROOM_POST, bookingId: bookingId1 }),
      service.settleOrder(tenantId, order.id, { method: PosSettlementMethod.ROOM_POST, bookingId: bookingId2 })
    ]);

    const successes = results.filter(r => r.status === 'fulfilled').length;
    const rejections = results.filter(r => r.status === 'rejected').length;

    const finalOrder = await prisma.withBypassRls(tx => tx.posOrder.findUnique({ where: { id: order.id } }));
    console.log(`Scenario 3 (ROOM_POST vs ROOM_POST diff): successes=${successes}, rejections=${rejections}, finalStatus=${finalOrder?.paymentStatus}, finalBooking=${finalOrder?.bookingId}`);
    expect(successes).toBe(1);
    expect(rejections).toBe(1);
    expect(finalOrder?.paymentStatus).toBe('POSTED_TO_ROOM');
    // The final booking should be whichever one won the race. Since we don't know which, we just assert it's one of them.
    expect([bookingId1, bookingId2]).toContain(finalOrder?.bookingId);
  });

  it('4. Concurrent CASH and ROOM_POST requests against one UNPAID order', async () => {
    const order = await createOrder();
    
    const results = await Promise.allSettled([
      service.settleOrder(tenantId, order.id, { method: PosSettlementMethod.CASH }),
      service.settleOrder(tenantId, order.id, { method: PosSettlementMethod.ROOM_POST, bookingId: bookingId1 })
    ]);

    const successes = results.filter(r => r.status === 'fulfilled').length;
    const rejections = results.filter(r => r.status === 'rejected').length;

    const finalOrder = await prisma.withBypassRls(tx => tx.posOrder.findUnique({ where: { id: order.id } }));
    console.log(`Scenario 4 (CASH vs ROOM_POST): successes=${successes}, rejections=${rejections}, finalStatus=${finalOrder?.paymentStatus}, finalBooking=${finalOrder?.bookingId}`);
    expect(successes).toBe(1);
    expect(rejections).toBe(1);
    // If it was ROOM_POST that won, bookingId will be bookingId1. If CASH won, it will be null.
    if (finalOrder?.paymentStatus === 'PAID_CASH') {
      expect(finalOrder?.bookingId).toBeNull();
    } else {
      expect(finalOrder?.paymentStatus).toBe('POSTED_TO_ROOM');
      expect(finalOrder?.bookingId).toBe(bookingId1);
    }
  });
});
