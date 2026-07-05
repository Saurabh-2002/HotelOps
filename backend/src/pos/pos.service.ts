import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuItemDto, CreatePosOrderDto } from './dto/pos.dto';

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
}
