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
  guestEmail?: string;
  guestPhone?: string;
  guestAddress?: string;
  roomNumber: string;
  roomType?: string;
  legacyType?: string;
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
    id: string;
    createdAt: string; // ISO 8601
    totalAmount: number;
    items: Array<{
      menuItem: { name: string };
      quantity: number;
      unitPrice: number;
    }>;
  }>;
  totalPosCharge: number;
  posGstRate: number; // The actual restaurant GST rate used (e.g. 0.05 or 0.18)
  posCgst: number;
  posSgst: number;

  // MISCELLANEOUS CHARGES
  miscCharges: Array<{
    id: string;
    description: string;
    amount: number;
    gstRate: number;
    cgst: number;
    sgst: number;
  }>;
  totalMiscCharge: number;
  miscCgst: number;
  miscSgst: number;

  // AGGREGATES
  cgst: number;
  sgst: number;
  grandTotal: number;

  // STATUS/PRESENTATION
  status: 'SETTLED';
}
