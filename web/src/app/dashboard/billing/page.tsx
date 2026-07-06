'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { Receipt, FileText, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

type GuestRecord = {
  fullName: string;
};

type Room = {
  roomNumber: string;
};

type Booking = {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  room: Room;
  guestRecords: GuestRecord[];
};

export default function BillingPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [invoiceLoadingId, setInvoiceLoadingId] = useState<string | null>(null);
  const [invoiceData, setInvoiceData] = useState<any>(null);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      // Fetch bookings, ideally we filter by CHECKED_IN or CHECKED_OUT for billing
      const data = await apiFetch('/bookings');
      setBookings(data.filter((b: Booking) => b.status === 'CHECKED_IN' || b.status === 'CHECKED_OUT'));
    } catch (err: any) {
      setError(err.message || 'Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleGenerateInvoice = async (bookingId: string) => {
    setInvoiceLoadingId(bookingId);
    try {
      const data = await apiFetch(`/billing/invoice/${bookingId}`, { method: 'POST' });
      setInvoiceData(data);
    } catch (err: any) {
      alert(err.message || 'Failed to generate invoice');
    } finally {
      setInvoiceLoadingId(null);
    }
  };

  const handleSettle = async (folioId: string) => {
    try {
      await apiFetch(`/billing/folio/${folioId}/settle`, { method: 'POST' });
      alert('Invoice settled successfully!');
      setInvoiceData(null); // close modal
      fetchBookings();
    } catch (err: any) {
      alert(err.message || 'Failed to settle invoice');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Billing & Invoices</h3>
          <p className="text-slate-500 text-sm mt-1">Generate folios and settle payments for stays.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookings.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p>No active or checked-out bookings found requiring billing.</p>
            </div>
          ) : (
            bookings.map((booking) => {
              const primaryGuest = booking.guestRecords[0]?.fullName || 'Unknown';
              return (
                <div key={booking.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold text-slate-900">{primaryGuest}</h4>
                      <p className="text-sm text-slate-500">Room {booking.room.roomNumber}</p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider ${
                      booking.status === 'CHECKED_OUT' ? 'bg-slate-100 text-slate-600' : 'bg-green-100 text-green-700'
                    }`}>
                      {booking.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="text-sm text-slate-600 mb-6">
                    <div>Check-in: {new Date(booking.checkInDate).toLocaleDateString()}</div>
                    <div>Check-out: {new Date(booking.checkOutDate).toLocaleDateString()}</div>
                  </div>

                  <button
                    onClick={() => handleGenerateInvoice(booking.id)}
                    disabled={invoiceLoadingId === booking.id}
                    className="w-full flex items-center justify-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    {invoiceLoadingId === booking.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4 mr-2" />
                    )}
                    Generate Invoice
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Tax Invoice</h3>
                <p className="text-sm text-slate-500">Folio #{invoiceData.folio.id.substring(0, 8).toUpperCase()}</p>
              </div>
              <button 
                onClick={() => setInvoiceData(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-8">
              <div className="flex justify-between mb-8">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Billed To</p>
                  <p className="font-semibold text-slate-900">{invoiceData.booking.guestRecords[0]?.fullName}</p>
                  <p className="text-sm text-slate-600">Room {invoiceData.booking.room.roomNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500 mb-1">Status</p>
                  {invoiceData.folio.status === 'SETTLED' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Settled
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Payment Pending
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-700 font-medium">
                    <tr>
                      <th className="px-4 py-3 border-b border-slate-200">Description</th>
                      <th className="px-4 py-3 border-b border-slate-200 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white text-slate-600">
                    <tr>
                      <td className="px-4 py-3">
                        <span className="font-semibold block text-slate-800">Room Charges</span>
                        <span className="text-xs">{invoiceData.breakdown.nights} nights @ ₹{Number(invoiceData.breakdown.roomRate)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">{Number(invoiceData.breakdown.totalRoomCharge).toFixed(2)}</td>
                    </tr>
                    
                    {invoiceData.breakdown.posOrders && invoiceData.breakdown.posOrders.map((order: any) => (
                      <tr key={order.id}>
                        <td className="px-4 py-3">
                           <span className="font-semibold block text-slate-800">Restaurant Order #{order.id.substring(0, 6).toUpperCase()}</span>
                           <ul className="text-xs mt-1 space-y-1">
                             {order.items.map((item: any, i: number) => (
                               <li key={i}>
                                 {item.quantity}x {item.menuItem.name} (@ ₹{item.unitPrice})
                               </li>
                             ))}
                           </ul>
                        </td>
                        <td className="px-4 py-3 text-right">{Number(order.totalAmount).toFixed(2)}</td>
                      </tr>
                    ))}

                    <tr className="bg-slate-50">
                      <td className="px-4 py-3 text-slate-600 font-medium text-right">Subtotal</td>
                      <td className="px-4 py-3 text-right font-medium">₹{(Number(invoiceData.breakdown.totalRoomCharge) + Number(invoiceData.breakdown.totalPosCharge)).toFixed(2)}</td>
                    </tr>

                    <tr>
                      <td className="px-4 py-2 text-slate-500 text-xs text-right">
                        Room CGST
                      </td>
                      <td className="px-4 py-2 text-right">{Number(invoiceData.breakdown.roomCgst).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-slate-500 text-xs text-right">
                        Room SGST
                      </td>
                      <td className="px-4 py-2 text-right">{Number(invoiceData.breakdown.roomSgst).toFixed(2)}</td>
                    </tr>

                    {Number(invoiceData.breakdown.totalPosCharge) > 0 && (
                      <>
                        <tr>
                          <td className="px-4 py-2 text-slate-500 text-xs text-right">
                            Restaurant CGST (2.5%)
                          </td>
                          <td className="px-4 py-2 text-right">{Number(invoiceData.breakdown.posCgst).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 text-slate-500 text-xs text-right">
                            Restaurant SGST (2.5%)
                          </td>
                          <td className="px-4 py-2 text-right">{Number(invoiceData.breakdown.posSgst).toFixed(2)}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 font-semibold text-slate-900 border-t border-slate-300">
                    <tr>
                      <td className="px-4 py-4 text-right text-base flex justify-end gap-4 items-center">
                         {invoiceData.folio.status === 'SETTLED' && (
                           <button onClick={() => window.print()} className="text-sm font-medium text-blue-600 hover:underline">
                             Print Invoice
                           </button>
                         )}
                         Grand Total
                      </td>
                      <td className="px-4 py-4 text-right text-base text-blue-600">₹{Number(invoiceData.breakdown.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="mt-8 flex justify-end space-x-3 print:hidden">
                <button
                  type="button"
                  onClick={() => setInvoiceData(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
                {invoiceData.folio.status !== 'SETTLED' && (
                  <button
                    onClick={() => handleSettle(invoiceData.folio.id)}
                    className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center shadow-sm"
                  >
                    Mark as Settled
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
