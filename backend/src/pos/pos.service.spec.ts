import { Test, TestingModule } from '@nestjs/testing';
import { PosService } from './pos.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PosSettlementMethod } from './dto/pos.dto';

describe('PosService (Integration)', () => {
  jest.setTimeout(30000);
  let service: PosService;
  let prisma: PrismaService;

  let tenantId: string;
  let tenant2Id: string;
  let menuItemId: string;
  let checkedInBookingId: string;
  let reservedBookingId: string;
  let checkedOutBookingId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PosService, PrismaService],
    }).compile();

    service = module.get<PosService>(PosService);
    prisma = module.get<PrismaService>(PrismaService);

    // Setup Test Data
    const ts = Date.now().toString();
    await prisma.withBypassRls(async (tx) => {
      const t1 = await tx.tenant.create({ data: { name: `Test Tenant 1 ${ts}` } });
      tenantId = t1.id;
      const t2 = await tx.tenant.create({ data: { name: `Test Tenant 2 ${ts}` } });
      tenant2Id = t2.id;

      const r1 = await tx.room.create({ data: { tenantId, roomNumber: `POS-${ts}`, legacyType: 'DLX', baseRate: 1000 } });
      
      const b1 = await tx.booking.create({
        data: { tenantId, roomId: r1.id, status: 'CHECKED_IN', checkInDate: new Date(), checkOutDate: new Date() }
      });
      checkedInBookingId = b1.id;

      const b2 = await tx.booking.create({
        data: { tenantId, roomId: r1.id, status: 'RESERVED', checkInDate: new Date(), checkOutDate: new Date() }
      });
      reservedBookingId = b2.id;

      const b3 = await tx.booking.create({
        data: { tenantId, roomId: r1.id, status: 'CHECKED_OUT', checkInDate: new Date(), checkOutDate: new Date() }
      });
      checkedOutBookingId = b3.id;

      const m1 = await tx.menuItem.create({
        data: { tenantId, name: 'Burger', category: 'Food', price: 150 }
      });
      menuItemId = m1.id;
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.withBypassRls(async (tx) => {
      await tx.posOrderItem.deleteMany({ where: { order: { tenantId: { in: [tenantId, tenant2Id] } } } });
      await tx.posOrder.deleteMany({ where: { tenantId: { in: [tenantId, tenant2Id] } } });
      await tx.menuItem.deleteMany({ where: { tenantId: { in: [tenantId, tenant2Id] } } });
      await tx.booking.deleteMany({ where: { tenantId: { in: [tenantId, tenant2Id] } } });
      await tx.room.deleteMany({ where: { tenantId: { in: [tenantId, tenant2Id] } } });
      await tx.tenant.deleteMany({ where: { id: { in: [tenantId, tenant2Id] } } });
    });
    await prisma.$disconnect();
  });

  async function createOrder(bId?: string) {
    return service.createOrder(tenantId, {
      bookingId: bId,
      items: [{ menuItemId, quantity: 2 }]
    });
  }

  describe('Order Creation & Defaults', () => {
    it('1. New order defaults to UNPAID', async () => {
      const order = await createOrder();
      expect(order.paymentStatus).toBe('UNPAID');
    });

    it('2. KOT creation/order creation does not financially settle the order (even with bookingId)', async () => {
      const order = await createOrder(checkedInBookingId);
      expect(order.paymentStatus).toBe('UNPAID');
      expect(order.status).toBe('KOT_PRINTED');
    });
  });

  describe('CASH Settlement', () => {
    it('3. Valid CASH settlement: UNPAID -> PAID_CASH', async () => {
      const order = await createOrder();
      const settled = await service.settleOrder(tenantId, order.id, { method: PosSettlementMethod.CASH });
      expect(settled.paymentStatus).toBe('PAID_CASH');
      expect(settled.status).toBe('KOT_PRINTED'); // 18. Kitchen/order status remains unchanged
    });

    it('11. Repeated CASH settlement does not duplicate (rejected)', async () => {
      const order = await createOrder();
      await service.settleOrder(tenantId, order.id, { method: PosSettlementMethod.CASH });
      await expect(
        service.settleOrder(tenantId, order.id, { method: PosSettlementMethod.CASH })
      ).rejects.toThrow(ConflictException);
    });

    it('14. ROOM_POST after PAID_CASH rejected', async () => {
      const order = await createOrder();
      await service.settleOrder(tenantId, order.id, { method: PosSettlementMethod.CASH });
      await expect(
        service.settleOrder(tenantId, order.id, { method: PosSettlementMethod.ROOM_POST, bookingId: checkedInBookingId })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('ROOM_POST Settlement', () => {
    it('4. Valid ROOM_POST settlement: UNPAID -> POSTED_TO_ROOM', async () => {
      const order = await createOrder();
      const settled = await service.settleOrder(tenantId, order.id, { method: PosSettlementMethod.ROOM_POST, bookingId: checkedInBookingId });
      expect(settled.paymentStatus).toBe('POSTED_TO_ROOM');
      expect(settled.bookingId).toBe(checkedInBookingId);
    });

    it('5. ROOM_POST requires a valid booking', async () => {
      const order = await createOrder();
      await expect(
        service.settleOrder(tenantId, order.id, { method: PosSettlementMethod.ROOM_POST, bookingId: 'non-existent' })
      ).rejects.toThrow(NotFoundException);
    });

    it('6, 7, 8. ROOM_POST requires CHECKED_IN booking (rejects RESERVED and CHECKED_OUT)', async () => {
      const order1 = await createOrder();
      await expect(
        service.settleOrder(tenantId, order1.id, { method: PosSettlementMethod.ROOM_POST, bookingId: reservedBookingId })
      ).rejects.toThrow(ConflictException);

      const order2 = await createOrder();
      await expect(
        service.settleOrder(tenantId, order2.id, { method: PosSettlementMethod.ROOM_POST, bookingId: checkedOutBookingId })
      ).rejects.toThrow(ConflictException);
    });

    it('12. Repeated ROOM_POST settlement does not duplicate (rejected)', async () => {
      const order = await createOrder();
      await service.settleOrder(tenantId, order.id, { method: PosSettlementMethod.ROOM_POST, bookingId: checkedInBookingId });
      await expect(
        service.settleOrder(tenantId, order.id, { method: PosSettlementMethod.ROOM_POST, bookingId: checkedInBookingId })
      ).rejects.toThrow(ConflictException);
    });

    it('13. CASH after POSTED_TO_ROOM rejected', async () => {
      const order = await createOrder();
      await service.settleOrder(tenantId, order.id, { method: PosSettlementMethod.ROOM_POST, bookingId: checkedInBookingId });
      await expect(
        service.settleOrder(tenantId, order.id, { method: PosSettlementMethod.CASH })
      ).rejects.toThrow(ConflictException);
    });

    it('15. Posting to a different booking after finalization rejected', async () => {
      const order = await createOrder();
      await service.settleOrder(tenantId, order.id, { method: PosSettlementMethod.ROOM_POST, bookingId: checkedInBookingId });
      await expect(
        service.settleOrder(tenantId, order.id, { method: PosSettlementMethod.ROOM_POST, bookingId: reservedBookingId })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Isolation & Edge Cases', () => {
    it('9. Cross-tenant order settlement rejected (Not Found)', async () => {
      const order = await createOrder();
      await expect(
        service.settleOrder(tenant2Id, order.id, { method: PosSettlementMethod.CASH })
      ).rejects.toThrow(NotFoundException);
    });

    it('10. Cross-tenant booking room-post rejected (Not Found)', async () => {
      const order = await createOrder(); // order in tenant1
      await expect(
        service.settleOrder(tenantId, order.id, { method: PosSettlementMethod.ROOM_POST, bookingId: 'booking-in-tenant2-some-fake-id' })
      ).rejects.toThrow(NotFoundException);
    });

    it('16. Invalid settlement method rejected', async () => {
      const order = await createOrder();
      await expect(
        service.settleOrder(tenantId, order.id, { method: 'CARD' as any })
      ).rejects.toThrow(BadRequestException);
    });

    it('17. Nonexistent order rejected', async () => {
      await expect(
        service.settleOrder(tenantId, 'fake-id', { method: PosSettlementMethod.CASH })
      ).rejects.toThrow(NotFoundException);
    });
  });
});

