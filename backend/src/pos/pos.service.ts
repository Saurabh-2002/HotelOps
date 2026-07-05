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

      if (dto.method === 'CASH') {
        return tx.posOrder.update({
          where: { id },
          data: { paymentStatus: 'PAID_CASH' }
        });
      }

      if (dto.method === 'ROOM_POST') {
        if (!dto.bookingId) {
          throw new BadRequestException('bookingId is required for ROOM_POST settlement');
        }

        const booking = await tx.booking.findFirst({
          where: { id: dto.bookingId, tenantId },
        });

        if (!booking) {
          throw new NotFoundException(`Booking ${dto.bookingId} not found`);
        }

        if (booking.status !== 'CHECKED_IN') {
          throw new ConflictException(`Cannot post to room. Booking status is ${booking.status}`);
        }

        return tx.posOrder.update({
          where: { id },
          data: {
            paymentStatus: 'POSTED_TO_ROOM',
            bookingId: dto.bookingId,
          },
        });
      }

      throw new BadRequestException('Invalid settlement method');
    });
  }
}
