export interface InvoiceSnapshotV1 {
  // IDENTITY
  snapshotVersion: 1;
  bookingId: string;
  folioId: string;
  tenantId: string;
  settledAt: string; // ISO 8601
  invoiceNumber?: string; // Stable identifier if supported in future

  // GUEST/STAY PRESENTATION
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  roomNumber: string;
  roomType: string;
  checkInDate: string; // ISO 8601
  checkOutDate: string; // ISO 8601
  nights: number;

  // ROOM FINANCIALS
  roomRate: number;
  roomGstRate: number; // e.g., 0.12 or 0.18
  totalRoomCharge: number;
  roomCgst: number;
  roomSgst: number;
  roomTotal: number;

  // RESTAURANT FINANCIALS
  posOrders: Array<{
    id: string; // The frontend expects 'id', not 'orderId'
    createdAt: string; // ISO 8601
    totalAmount: number; // Frontend might expect totalAmount instead of subtotal
    items: Array<{
      menuItem: { name: string }; // Frontend expects menuItem.name
      quantity: number;
      unitPrice: number;
    }>;
  }>;

  // AGGREGATES
  totalPosCharge: number;
  posCgst: number;
  posSgst: number;
  cgst: number;
  sgst: number;
  grandTotal: number;

  // STATUS/PRESENTATION
  status: 'SETTLED';
}
