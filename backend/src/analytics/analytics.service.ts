import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(tenantId: string, range: string = 'month') {
    return this.prisma.withTenant(tenantId, async (tx) => {
    const now = new Date();
    let startDate = new Date(0); // Epoch, means "all time"
    
    if (range === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    // 1. Fetch Rooms and Room Types
    const rooms = await tx.room.findMany({
      where: { status: { not: 'OUT_OF_ORDER' } },
      include: { roomType: true }
    });
    console.log(`[Analytics] tenantId: ${tenantId}, rooms length: ${rooms.length}`);
    const totalAvailableRooms = rooms.length;

    // 2. Fetch Folios (for Room Revenue)
    const folios = await tx.folio.findMany({
      where: { 
        status: 'SETTLED',
        settledAt: { gte: startDate }
      },
    });

    const roomRevenue = folios.reduce((sum, folio) => sum + Number(folio.totalAmount), 0);

    // 3. Fetch POS Orders (for Restaurant Revenue)
    // We exclude POSTED_TO_ROOM because that revenue is already captured in the Folio
    const posOrders = await tx.posOrder.findMany({
      where: {
        status: { not: 'CANCELLED' },
        paymentStatus: { notIn: ['UNPAID', 'POSTED_TO_ROOM'] },
        createdAt: { gte: startDate }
      },
      include: { items: { include: { menuItem: true } } }
    });

    const restaurantRevenue = posOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    const totalRevenue = roomRevenue + restaurantRevenue;

    // 4. Fetch Bookings (for Occupancy, ADR, RevPAR, Forecasting)
    const bookings = await tx.booking.findMany({
      where: {
        checkInDate: { gte: startDate },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] }
      },
      include: { room: { include: { roomType: true } }, posOrders: true }
    });

    const totalBookings = bookings.length;
    const occupiedRooms = bookings.filter(b => b.status === 'CHECKED_IN').length;
    const occupancyRate = totalAvailableRooms > 0 ? (occupiedRooms / totalAvailableRooms) * 100 : 0;
    
    const revPar = totalAvailableRooms > 0 ? roomRevenue / totalAvailableRooms : 0;
    const adr = totalBookings > 0 ? roomRevenue / totalBookings : 0; // Simple ADR based on total bookings in period

    // 5. Cross-Selling (Attachment Rate)
    const bookingsWithFood = bookings.filter(b => b.posOrders && b.posOrders.length > 0).length;
    const foodAttachmentRate = totalBookings > 0 ? (bookingsWithFood / totalBookings) * 100 : 0;

    // 6. Top Room Types
    const roomTypeCounts: Record<string, number> = {};
    bookings.forEach(b => {
      const typeName = b.room?.roomType?.name || 'Unassigned';
      roomTypeCounts[typeName] = (roomTypeCounts[typeName] || 0) + 1;
    });
    const topRoomTypes = Object.entries(roomTypeCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 7. Top Menu Items
    const menuItemCounts: Record<string, number> = {};
    const allPosOrders = await tx.posOrder.findMany({
        where: { createdAt: { gte: startDate }, status: { not: 'CANCELLED' } },
        include: { items: true }
    });
    
    allPosOrders.forEach(order => {
      order.items.forEach(item => {
        const name = item.itemName || 'Unknown Item';
        menuItemCounts[name] = (menuItemCounts[name] || 0) + item.quantity;
      });
    });
    const topMenuItems = Object.entries(menuItemCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 8. 7-Day Forecast
    const forecast: any[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      
      // All bookings that overlap with this date
      const activeOnDate = bookings.filter(b => {
        const checkIn = new Date(b.checkInDate).toISOString().split('T')[0];
        const checkOut = new Date(b.checkOutDate).toISOString().split('T')[0];
        return checkIn <= dateStr && checkOut > dateStr;
      }).length;
      
      const checkIns = bookings.filter(b => new Date(b.checkInDate).toISOString().split('T')[0] === dateStr).length;
      const checkOuts = bookings.filter(b => new Date(b.checkOutDate).toISOString().split('T')[0] === dateStr).length;

      forecast.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        occupied: activeOnDate,
        checkIns,
        checkOuts
      });
    }

    // 9. Revenue Trends (Last 6 months)
    const trends: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      
      const monthFolios = await tx.folio.findMany({
        where: { status: 'SETTLED', settledAt: { gte: monthStart, lte: monthEnd } }
      });
      const monthRoomRev = monthFolios.reduce((s, f) => s + Number(f.totalAmount), 0);
      
      const monthPos = await tx.posOrder.findMany({
        where: { status: { not: 'CANCELLED' }, paymentStatus: { notIn: ['UNPAID', 'POSTED_TO_ROOM'] }, createdAt: { gte: monthStart, lte: monthEnd } }
      });
      const monthRestRev = monthPos.reduce((s, p) => s + Number(p.totalAmount), 0);

      trends.push({
        name: d.toLocaleDateString('en-US', { month: 'short' }),
        roomRevenue: monthRoomRev,
        restaurantRevenue: monthRestRev,
        totalRevenue: monthRoomRev + monthRestRev
      });
    }

    // 10. Operational Metrics for Front Desk
    const today = new Date().toISOString().split('T')[0];
    const todaysArrivals = bookings.filter(b => new Date(b.checkInDate).toISOString().split('T')[0] === today && b.status === 'RESERVED').length;
    const unsettledGuests = bookings.filter(b => b.status === 'CHECKED_IN').length; // Simplified for now, assume all checked-in need settlement eventually
    const pendingOrders = posOrders.filter(o => o.paymentStatus === 'UNPAID').length;

    return {
      operational: {
        availableRooms: totalAvailableRooms - occupiedRooms,
        guestsInHouse: occupiedRooms,
        todaysArrivals,
        unsettledGuests,
        pendingOrders
      },
      revenue: {
        total: totalRevenue,
        rooms: roomRevenue,
        restaurant: restaurantRevenue
      },
      metrics: {
        occupancyRate: Math.round(occupancyRate),
        revPar: Math.round(revPar),
        adr: Math.round(adr),
        foodAttachmentRate: Math.round(foodAttachmentRate)
      },
      topRoomTypes,
      topMenuItems,
      forecast,
      trends
    };
    });
  }
}
