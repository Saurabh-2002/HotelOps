import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFolioDto, CreateMiscChargeDto } from './dto/billing.dto';
import { InvoiceSnapshotV1 } from './dto/invoice-snapshot.dto';

// Fallback defaults if PropertySettings doesn't have GST config yet
const DEFAULT_GST = {
  roomGstStandardRate: 0.12,
  roomGstPremiumRate: 0.18,
  roomGstThreshold: 7500,
  restaurantGstRate: 0.05,
};

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  private _getGstConfig(settings: any) {
    return {
      roomGstStandardRate: settings?.roomGstStandardRate ? Number(settings.roomGstStandardRate) : DEFAULT_GST.roomGstStandardRate,
      roomGstPremiumRate: settings?.roomGstPremiumRate ? Number(settings.roomGstPremiumRate) : DEFAULT_GST.roomGstPremiumRate,
      roomGstThreshold: settings?.roomGstThreshold ? Number(settings.roomGstThreshold) : DEFAULT_GST.roomGstThreshold,
      restaurantGstRate: settings?.restaurantGstRate ? Number(settings.restaurantGstRate) : DEFAULT_GST.restaurantGstRate,
    };
  }

  calculateRoomGst(totalAmount: number, dailyRate: number, gstConfig: ReturnType<typeof this._getGstConfig>) {
    const totalRate = dailyRate <= gstConfig.roomGstThreshold
      ? gstConfig.roomGstStandardRate
      : gstConfig.roomGstPremiumRate;
    const cgstRate = totalRate / 2;
    const sgstRate = totalRate / 2;
    const cgst = Math.round(totalAmount * cgstRate * 100) / 100;
    const sgst = Math.round(totalAmount * sgstRate * 100) / 100;
    return { cgst, sgst, totalRate };
  }

  // Common dynamic calculation path
  private _calculateInvoiceViewModel(booking: any, settings: any, miscChargesData: any[]): InvoiceSnapshotV1 {
    const gstConfig = this._getGstConfig(settings);

    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000));
    const roomRate = Number(booking.room.baseRate);
    const totalRoomCharge = roomRate * nights;
    
    const roomGst = this.calculateRoomGst(totalRoomCharge, roomRate, gstConfig);
    const roomGstRate = roomGst.totalRate;

    // Restaurant charges
    let totalPosCharge = 0;
    const posOrders = booking.posOrders.map((order: any) => {
      const orderSubtotal = Number(order.totalAmount);
      totalPosCharge += orderSubtotal;
      
      return {
        id: order.id,
        createdAt: new Date(order.createdAt).toISOString(),
        totalAmount: orderSubtotal,
        items: order.items.map((item: any) => ({
          menuItem: { name: item.itemName },
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
        }))
      };
    });

    // Restaurant GST: for orders posted to a room, use room-tariff-linked rate if room is premium
    // Per Indian GST law: restaurants in hotels with room tariff > ₹7500 charge 18% GST
    let posGstRate: number;
    if (roomRate > gstConfig.roomGstThreshold) {
      // Premium hotel — restaurant charges attract the same rate as the room
      posGstRate = gstConfig.roomGstPremiumRate;
    } else {
      // Standard hotel — restaurant charges use the flat restaurant GST rate
      posGstRate = gstConfig.restaurantGstRate;
    }
    const posCgst = Math.round(totalPosCharge * (posGstRate / 2) * 100) / 100;
    const posSgst = Math.round(totalPosCharge * (posGstRate / 2) * 100) / 100;

    // Miscellaneous charges
    let totalMiscCharge = 0;
    let miscCgst = 0;
    let miscSgst = 0;
    const miscCharges = miscChargesData.map((mc: any) => {
      const amount = Number(mc.amount);
      const gstRate = Number(mc.gstRate);
      const itemCgst = Math.round(amount * (gstRate / 2) * 100) / 100;
      const itemSgst = Math.round(amount * (gstRate / 2) * 100) / 100;
      totalMiscCharge += amount;
      miscCgst += itemCgst;
      miscSgst += itemSgst;
      return {
        id: mc.id,
        description: mc.description,
        amount,
        gstRate,
        cgst: itemCgst,
        sgst: itemSgst,
      };
    });

    const cgst = roomGst.cgst + posCgst + miscCgst;
    const sgst = roomGst.sgst + posSgst + miscSgst;
    const grandTotal = totalRoomCharge + totalPosCharge + totalMiscCharge + cgst + sgst;

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
      guestAddress: guest.address || '',
      roomNumber: booking.room?.roomNumber || '',
      roomType: booking.room?.roomType?.name || '',
      legacyType: booking.room?.legacyType || '',
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
      posGstRate,
      posCgst,
      posSgst,
      miscCharges,
      totalMiscCharge,
      miscCgst,
      miscSgst,
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
          room: {
            include: { roomType: true }
          },
          guestRecords: true,
          posOrders: {
            where: { paymentStatus: 'POSTED_TO_ROOM' },
            include: { items: { include: { menuItem: true } } }
          }
        },
      });
      if (!booking) throw new NotFoundException('Booking not found');

      // Fetch property settings for GST config
      const settings = await tx.propertySettings.findUnique({ where: { tenantId } });

      // Fetch misc charges for this booking
      const miscCharges = await tx.miscCharge.findMany({ where: { bookingId, tenantId } });

      const snapshot = this._calculateInvoiceViewModel(booking, settings, miscCharges);
      snapshot.status = 'SETTLED';

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
          room: {
            include: { roomType: true }
          },
          guestRecords: true,
          posOrders: {
            where: { paymentStatus: 'POSTED_TO_ROOM' },
            include: { items: { include: { menuItem: true } } }
          }
        },
      });
      if (!booking) throw new NotFoundException('Booking not found');

      // Fetch property settings for GST config
      const settings = await tx.propertySettings.findUnique({ where: { tenantId } });

      // Fetch misc charges for this booking
      const miscCharges = await tx.miscCharge.findMany({ where: { bookingId, tenantId } });

      const snapshot = this._calculateInvoiceViewModel(booking, settings, miscCharges);
      const settledAt = new Date();
      snapshot.settledAt = settledAt.toISOString();

      try {
        const folioData = {
          tenantId,
          bookingId,
          status: 'SETTLED' as const,
          totalAmount: snapshot.grandTotal,
          invoiceSnapshot: snapshot as any,
          snapshotVersion: 1,
          settledAt,
        };
        const folio = await tx.folio.upsert({
          where: { bookingId },
          create: folioData,
          update: folioData,
        });
        snapshot.folioId = folio.id;
        
        // Update the snapshot in DB now that we have the folioId
        const finalFolio = await tx.folio.update({
          where: { id: folio.id },
          data: { invoiceSnapshot: snapshot as any }
        });

        return finalFolio;
      } catch (err: any) {
        throw err;
      }
    });
  }

  // --- Miscellaneous Charges ---

  async addMiscCharge(tenantId: string, dto: CreateMiscChargeDto) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      // Verify booking exists and folio is not yet settled
      const booking = await tx.booking.findFirst({
        where: { id: dto.bookingId, tenantId },
      });
      if (!booking) throw new NotFoundException('Booking not found');

      const existingFolio = await tx.folio.findUnique({ where: { bookingId: dto.bookingId } });
      if (existingFolio && existingFolio.status === 'SETTLED') {
        throw new ConflictException('Cannot add charges to a settled folio.');
      }

      return tx.miscCharge.create({
        data: {
          tenantId,
          bookingId: dto.bookingId,
          description: dto.description,
          amount: dto.amount,
          gstRate: dto.gstRate ?? 0.18,
        },
      });
    });
  }

  async removeMiscCharge(tenantId: string, chargeId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const charge = await tx.miscCharge.findFirst({
        where: { id: chargeId, tenantId },
      });
      if (!charge) throw new NotFoundException('Miscellaneous charge not found');

      // Verify folio is not settled
      const existingFolio = await tx.folio.findUnique({ where: { bookingId: charge.bookingId } });
      if (existingFolio && existingFolio.status === 'SETTLED') {
        throw new ConflictException('Cannot remove charges from a settled folio.');
      }

      return tx.miscCharge.delete({ where: { id: chargeId } });
    });
  }
}
