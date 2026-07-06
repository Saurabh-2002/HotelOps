import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFolioDto } from './dto/billing.dto';
import { InvoiceSnapshotV1 } from './dto/invoice-snapshot.dto';

const GST_RATES = {
  STANDARD: { cgstRate: 0.06, sgstRate: 0.06 },
  PREMIUM: { cgstRate: 0.09, sgstRate: 0.09 },
};

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  calculateGst(totalAmount: number, dailyRate?: number) {
    const basis = dailyRate !== undefined ? dailyRate : totalAmount;
    const rate = basis <= 7500 ? GST_RATES.STANDARD : GST_RATES.PREMIUM;
    const cgst = Math.round(totalAmount * rate.cgstRate * 100) / 100;
    const sgst = Math.round(totalAmount * rate.sgstRate * 100) / 100;
    return { cgst, sgst, total: totalAmount + cgst + sgst };
  }

  // Common dynamic calculation path
  private _calculateInvoiceViewModel(booking: any): InvoiceSnapshotV1 {
    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000));
    const roomRate = Number(booking.room.baseRate);
    const totalRoomCharge = roomRate * nights;
    
    const roomGst = this.calculateGst(totalRoomCharge, roomRate);
    const roomGstRate = roomRate <= 7500 ? 0.12 : 0.18;

    let totalPosCharge = 0;
    const posOrders = booking.posOrders.map((order: any) => {
      const orderSubtotal = Number(order.totalAmount);
      totalPosCharge += orderSubtotal;
      
      return {
        id: order.id,
        createdAt: new Date(order.createdAt).toISOString(),
        totalAmount: orderSubtotal,
        items: order.items.map((item: any) => ({
          menuItem: { name: item.itemName }, // Use transactional name
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice), // Use transactional price
        }))
      };
    });

    const posCgst = Math.round(totalPosCharge * 0.025 * 100) / 100;
    const posSgst = Math.round(totalPosCharge * 0.025 * 100) / 100;

    const cgst = roomGst.cgst + posCgst;
    const sgst = roomGst.sgst + posSgst;
    const grandTotal = totalRoomCharge + totalPosCharge + cgst + sgst;

    const guest = booking.guestRecords?.[0] || {};

    return {
      snapshotVersion: 1,
      bookingId: booking.id,
      folioId: '',
      tenantId: booking.tenantId,
      settledAt: '',
      guestName: guest.fullName || 'Unknown Guest',
      guestEmail: guest.email || '',
      guestPhone: guest.phone || '',
      roomNumber: booking.room.number,
      roomType: booking.room.type,
      checkInDate: checkIn.toISOString(),
      checkOutDate: checkOut.toISOString(),
      nights,
      roomRate,
      roomGstRate,
      totalRoomCharge,
      roomCgst: roomGst.cgst,
      roomSgst: roomGst.sgst,
      roomTotal: totalRoomCharge + roomGst.cgst + roomGst.sgst,
      posOrders,
      totalPosCharge,
      posCgst,
      posSgst,
      cgst,
      sgst,
      grandTotal,
      status: 'SETTLED'
    };
  }

  async findAllByBooking(tenantId: string, bookingId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      return tx.folio.findMany({
        where: { bookingId },
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  async findOne(tenantId: string, id: string) {
    let lookupId = id;
    let isBookingId = false;
    if (id.startsWith('OPEN-')) {
      lookupId = id.substring(5);
      isBookingId = true;
    }
    
    return this.prisma.withTenant(tenantId, async (tx) => {
      let folio;
      if (isBookingId) {
        folio = await tx.folio.findUnique({ where: { bookingId: lookupId } });
      } else {
        folio = await tx.folio.findUnique({ where: { id } });
      }

      if (!folio && !isBookingId) throw new NotFoundException('Folio not found');
      
      if (!folio && isBookingId) {
        return (await this.generateInvoiceForBooking(tenantId, lookupId)).folio;
      }
      return folio;
    });
  }

  async createFolio(tenantId: string, dto: CreateFolioDto) {
    throw new ConflictException('Folios are created dynamically or frozen via settlement.');
  }

  async generateInvoiceForBooking(tenantId: string, bookingId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const existingFolio = await tx.folio.findUnique({ where: { bookingId } });
      
      if (existingFolio && existingFolio.status === 'SETTLED') {
        if (!existingFolio.invoiceSnapshot) {
          throw new ConflictException('Legacy settled folio is missing a historical snapshot. Cannot reconstruct invoice.');
        }
        const snapshot = existingFolio.invoiceSnapshot as any as InvoiceSnapshotV1;
        if (snapshot.snapshotVersion !== 1) {
          throw new ConflictException(`Unsupported snapshot version: ${snapshot.snapshotVersion}`);
        }
        return {
          folio: { ...snapshot, id: snapshot.folioId },
          breakdown: snapshot,
          booking: { id: bookingId }
        };
      }

      const booking = await tx.booking.findFirst({
        where: { id: bookingId, tenantId },
        include: {
          room: true,
          guestRecords: true,
          posOrders: {
            where: { paymentStatus: 'POSTED_TO_ROOM' },
            include: { items: { include: { menuItem: true } } }
          }
        },
      });
      if (!booking) throw new NotFoundException('Booking not found');

      const snapshot = this._calculateInvoiceViewModel(booking);
      snapshot.status = 'SETTLED'; // Technically OPEN logic, but snapshot interface uses SETTLED string

      return {
        folio: {
          id: `OPEN-${bookingId}`,
          tenantId,
          bookingId,
          status: 'OPEN',
          totalAmount: snapshot.grandTotal,
          createdAt: new Date(),
          updatedAt: new Date(),
          snapshot
        },
        breakdown: snapshot,
        booking,
      };
    });
  }

  async settleFolio(tenantId: string, id: string) {
    let bookingId = id;
    if (id.startsWith('OPEN-')) {
      bookingId = id.substring(5);
    }
    
    return this.prisma.withTenant(tenantId, async (tx) => {
      const bookings: any[] = await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${bookingId} AND "tenantId" = ${tenantId} FOR UPDATE`;
      if (bookings.length === 0) {
        throw new NotFoundException('Booking not found');
      }

      const existingFolio = await tx.folio.findUnique({ where: { bookingId } });
      if (existingFolio && existingFolio.status === 'SETTLED') {
        throw new ConflictException('Folio is already settled');
      }

      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          room: true,
          guestRecords: true,
          posOrders: {
            where: { paymentStatus: 'POSTED_TO_ROOM' },
            include: { items: { include: { menuItem: true } } }
          }
        },
      });
      if (!booking) throw new NotFoundException('Booking not found');

      const snapshot = this._calculateInvoiceViewModel(booking);
      const settledAt = new Date();
      snapshot.settledAt = settledAt.toISOString();

      try {
        const folio = await tx.folio.create({
          data: {
            tenantId,
            bookingId,
            status: 'SETTLED',
            totalAmount: snapshot.grandTotal,
            invoiceSnapshot: snapshot as any,
            snapshotVersion: 1,
            settledAt,
          },
        });
        snapshot.folioId = folio.id;
        
        // Update the snapshot in DB now that we have the folioId
        const finalFolio = await tx.folio.update({
          where: { id: folio.id },
          data: { invoiceSnapshot: snapshot as any }
        });

        return finalFolio;
      } catch (err: any) {
        if (err.code === 'P2002') {
          throw new ConflictException('Folio is already settled');
        }
        throw err;
      }
    });
  }
}
