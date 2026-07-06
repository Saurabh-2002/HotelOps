import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuItemDto, CreatePosOrderDto, SettlePosOrderDto } from './dto/pos.dto';

@Injectable()
export class PosService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Menu Items ---

  async findAllMenuItems(tenantId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      return tx.menuItem.findMany({
        where: { tenantId },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
    });
  }

  async createMenuItem(tenantId: string, dto: CreateMenuItemDto) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      return tx.menuItem.create({
        data: { ...dto, tenantId },
      });
    });
  }

  // --- POS Orders ---

  async findAllOrders(tenantId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      return tx.posOrder.findMany({
        where: { tenantId },
        include: {
          items: {
            include: { menuItem: true },
          },
          booking: {
            include: { room: true, guestRecords: true },
          }
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  async createOrder(tenantId: string, dto: CreatePosOrderDto) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      // Get all menu items to calculate total and unit prices
      const itemIds = dto.items.map((i) => i.menuItemId);
      const menuItems = await tx.menuItem.findMany({
        where: { id: { in: itemIds } },
      });

      let totalAmount = 0;
      const orderItemsData = dto.items.map((item) => {
        const menuItem = menuItems.find((m: any) => m.id === item.menuItemId);
        if (!menuItem) throw new NotFoundException(`Menu item ${item.menuItemId} not found`);
        const unitPrice = Number(menuItem.price);
        totalAmount += unitPrice * item.quantity;
        return {
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice,
          itemName: menuItem.name,
          notes: item.notes,
        };
      });

      return tx.posOrder.create({
        data: {
          tenantId,
          bookingId: dto.bookingId || null,
          totalAmount,
          status: 'KOT_PRINTED',
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: { include: { menuItem: true } },
          booking: { include: { room: true } },
        },
      });
    });
  }

  async updateOrderStatus(tenantId: string, id: string, status: 'KOT_PRINTED' | 'SERVED' | 'BILLED' | 'CANCELLED') {
    return this.prisma.withTenant(tenantId, async (tx) => {
      return tx.posOrder.update({
        where: { id },
        data: { status },
        include: {
          items: { include: { menuItem: true } },
        },
      });
    });
  }

  async settleOrder(tenantId: string, id: string, dto: SettlePosOrderDto) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const order = await tx.posOrder.findUnique({ where: { id } });
      if (!order) {
        throw new NotFoundException(`Order ${id} not found`);
      }

      if (order.paymentStatus !== 'UNPAID') {
        throw new ConflictException(`Order is already financially finalized with status ${order.paymentStatus}`);
      }

      let updateData: any = {};
      
      if (dto.method === 'CASH') {
        updateData = { paymentStatus: 'PAID_CASH' };
      } else if (dto.method === 'ROOM_POST') {
        if (!dto.bookingId) {
          throw new BadRequestException('bookingId is required for ROOM_POST settlement');
        }

        const bookings: any[] = await tx.$queryRaw`SELECT id, status FROM "Booking" WHERE id = ${dto.bookingId} AND "tenantId" = ${tenantId} FOR UPDATE`;
        if (bookings.length === 0) {
          throw new NotFoundException(`Booking ${dto.bookingId} not found`);
        }

        const bookingStatus = bookings[0].status;
        if (bookingStatus !== 'CHECKED_IN') {
          throw new ConflictException(`Cannot post to room. Booking status is ${bookingStatus}`);
        }

        const existingFolio = await tx.folio.findUnique({ where: { bookingId: dto.bookingId } });
        if (existingFolio && existingFolio.status === 'SETTLED') {
          throw new ConflictException(`Cannot post to room. Folio is already SETTLED`);
        }

        updateData = {
          paymentStatus: 'POSTED_TO_ROOM',
          bookingId: dto.bookingId,
        };
      } else {
        throw new BadRequestException('Invalid settlement method');
      }

      // Atomic compare-and-set update to prevent concurrent race conditions
      const result = await tx.posOrder.updateMany({
        where: { id, paymentStatus: 'UNPAID' },
        data: updateData,
      });

      if (result.count === 0) {
        throw new ConflictException('Order settlement failed due to concurrent modification or it is already settled.');
      }

      return tx.posOrder.findUnique({ where: { id } });
    });
  }
}
