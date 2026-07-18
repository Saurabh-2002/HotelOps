'use client';

import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { apiFetch, fetcher } from '@/lib/api';
import { Receipt, FileText, CheckCircle2, Loader2, ArrowRight, UtensilsCrossed, Calendar, Search, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import AlertDialog from '@/components/AlertDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { TableSkeleton } from '@/components/Skeletons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

type GuestRecord = {
  fullName: string;
};

type Room = {
  roomNumber: string;
  legacyType?: string;
  roomType?: { name: string };
};

type Booking = {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  room: Room;
  guestRecords: GuestRecord[];
};

type PosOrder = {
  id: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  items: any[];
  booking?: Booking;
};

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<'HOTEL' | 'RESTAURANT'>('HOTEL');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [invoiceLoadingId, setInvoiceLoadingId] = useState<string | null>(null);
  const [invoiceData, setInvoiceData] = useState<any>(null);

  // Property Settings
  const { data: settings } = useSWR('/settings', fetcher);

  // Restaurant Orders
  const { data: posOrdersData, mutate: mutatePosOrders, error: posError } = useSWR('/pos/orders', fetcher);
  const posOrders: PosOrder[] = posOrdersData || [];
  const isPosLoading = !posOrdersData && !posError;
  const [selectedPosOrder, setSelectedPosOrder] = useState<PosOrder | null>(null);
  const [isSettlingPos, setIsSettlingPos] = useState(false);
  
  // Search and Pagination
  const [hotelSearch, setHotelSearch] = useState('');
  const [hotelPage, setHotelPage] = useState(1);
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [restaurantPage, setRestaurantPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, title?: string, message: string, type: 'error'|'success'|'info'}>({ isOpen: false, message: '', type: 'info' });
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, message: string, action?: string, id?: string}>({ isOpen: false, title: '', message: '' });

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
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
      setAlertConfig({ isOpen: true, title: 'Error', message: err.message || 'Failed to generate invoice', type: 'error' });
    } finally {
      setInvoiceLoadingId(null);
    }
  };

  const handleSettle = async (folioId: string) => {
    try {
      await apiFetch(`/billing/folio/${folioId}/settle`, { method: 'POST' });
      setAlertConfig({ isOpen: true, title: 'Success', message: 'Invoice settled successfully!', type: 'success' });
      setInvoiceData(null);
      fetchBookings();
    } catch (err: any) {
      setAlertConfig({ isOpen: true, title: 'Error', message: err.message || 'Failed to settle invoice', type: 'error' });
    }
  };

  const handleSettlePosOrder = async (orderId: string) => {
    setIsSettlingPos(true);
    try {
      await apiFetch(`/pos/orders/${orderId}/settle`, { 
        method: 'POST',
        body: JSON.stringify({ method: 'CASH' })
      });
      setAlertConfig({ isOpen: true, title: 'Success', message: 'Order settled successfully!', type: 'success' });
      setSelectedPosOrder(null);
      mutatePosOrders();
    } catch (err: any) {
      setAlertConfig({ isOpen: true, title: 'Error', message: err.message || 'Failed to settle order', type: 'error' });
    } finally {
      setIsSettlingPos(false);
    }
  };

  // Derived State for Hotel
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const guestName = b.guestRecords[0]?.fullName?.toLowerCase() || '';
      const roomNum = b.room?.roomNumber?.toLowerCase() || '';
      const status = b.status.toLowerCase();
      const q = hotelSearch.toLowerCase();
      return guestName.includes(q) || roomNum.includes(q) || status.includes(q);
    });
  }, [bookings, hotelSearch]);

  const paginatedBookings = useMemo(() => {
    const start = (hotelPage - 1) * ITEMS_PER_PAGE;
    return filteredBookings.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBookings, hotelPage]);

  // Derived State for Restaurant
  const filteredPosOrders = useMemo(() => {
    return posOrders.filter(o => {
      const orderId = o.id.toLowerCase();
      const status = o.paymentStatus.toLowerCase();
      const q = restaurantSearch.toLowerCase();
      return orderId.includes(q) || status.includes(q);
    });
  }, [posOrders, restaurantSearch]);

  const paginatedPosOrders = useMemo(() => {
    const start = (restaurantPage - 1) * ITEMS_PER_PAGE;
    return filteredPosOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPosOrders, restaurantPage]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      <style type="text/css" media="print">
        {`
          @page { size: auto; margin: 0mm; }
        `}
      </style>
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Billing & Invoices</h3>
          <p className="text-slate-500 text-sm mt-1">Generate folios and settle payments for stays and restaurant orders.</p>
        </div>
        <div className="flex bg-slate-200/50 p-1 rounded-lg">
          <Button
            variant={activeTab === 'HOTEL' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setActiveTab('HOTEL');
              setHotelPage(1);
            }}
          >
            Hotel Folios
          </Button>
          <Button
            variant={activeTab === 'RESTAURANT' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setActiveTab('RESTAURANT');
              setRestaurantPage(1);
            }}
          >
            Restaurant Orders
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 print:hidden">
          {error}
        </div>
      )}

      {/* Hotel Tab Content */}
      {activeTab === 'HOTEL' && (
        <div className="space-y-4 print:hidden">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by guest, room, or status..."
                className="pl-9"
                value={hotelSearch}
                onChange={(e) => {
                  setHotelSearch(e.target.value);
                  setHotelPage(1);
                }}
              />
            </div>
          </div>

          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4">Guest</th>
                      <th className="px-6 py-4">Room</th>
                      <th className="px-6 py-4">Dates</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedBookings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                          <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p>No active or checked-out bookings found requiring billing.</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedBookings.map((booking) => {
                        const primaryGuest = booking.guestRecords[0]?.fullName || 'Unknown';
                        return (
                          <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-900">{primaryGuest}</td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-slate-900">Room {booking.room.roomNumber}</div>
                              <div className="text-xs text-slate-500">{booking.room.roomType?.name || booking.room.legacyType || '—'}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center text-slate-700">
                                <Calendar className="w-4 h-4 mr-1.5 text-slate-400" />
                                {new Date(booking.checkInDate).toLocaleDateString()} - {new Date(booking.checkOutDate).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant={booking.status === 'CHECKED_OUT' ? 'secondary' : 'default'} className={booking.status === 'CHECKED_OUT' ? 'bg-slate-100 text-slate-600' : 'bg-green-100 text-green-700'}>
                                {booking.status.replace('_', ' ')}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button
                                onClick={() => handleGenerateInvoice(booking.id)}
                                disabled={invoiceLoadingId === booking.id}
                                variant="outline"
                                size="sm"
                              >
                                {invoiceLoadingId === booking.id ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <FileText className="w-4 h-4 mr-2" />
                                )}
                                Generate Invoice
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {filteredBookings.length > ITEMS_PER_PAGE && (
                <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                  <p className="text-sm text-slate-500">
                    Showing {((hotelPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(hotelPage * ITEMS_PER_PAGE, filteredBookings.length)} of {filteredBookings.length} results
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={hotelPage === 1}
                      onClick={() => setHotelPage(p => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={hotelPage * ITEMS_PER_PAGE >= filteredBookings.length}
                      onClick={() => setHotelPage(p => p + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Restaurant Tab Content */}
      {activeTab === 'RESTAURANT' && (
        <div className="space-y-4 print:hidden">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by Order ID or status..."
                className="pl-9"
                value={restaurantSearch}
                onChange={(e) => {
                  setRestaurantSearch(e.target.value);
                  setRestaurantPage(1);
                }}
              />
            </div>
          </div>

          {isPosLoading ? (
            <TableSkeleton rows={5} />
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4">Order ID</th>
                      <th className="px-6 py-4">Date & Time</th>
                      <th className="px-6 py-4">Total Items</th>
                      <th className="px-6 py-4">Total Amount</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedPosOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                          <UtensilsCrossed className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p>No restaurant orders found.</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedPosOrders.map((order) => {
                        const isPaid = order.paymentStatus === 'PAID_CASH';
                        const isRoom = order.paymentStatus === 'POSTED_TO_ROOM';
                        const isUnpaid = order.paymentStatus === 'UNPAID';
                        
                        return (
                          <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-900">
                              #{order.id.substring(0, 6).toUpperCase()}
                            </td>
                            <td className="px-6 py-4 text-slate-500">
                              {new Date(order.createdAt).toLocaleString()}
                            </td>
                            <td className="px-6 py-4">
                              {order.items.reduce((sum: number, i: any) => sum + i.quantity, 0)}
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-900">
                              ₹{Number(order.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4">
                              {isPaid && <Badge className="bg-green-100 text-green-700">Paid (Cash)</Badge>}
                              {isRoom && <Badge className="bg-blue-100 text-blue-700">Room Post</Badge>}
                              {isUnpaid && <Badge variant="secondary" className="bg-amber-100 text-amber-700">Unpaid</Badge>}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button
                                onClick={() => setSelectedPosOrder(order)}
                                variant="outline"
                                size="sm"
                              >
                                <Receipt className="w-4 h-4 mr-2" />
                                View Bill
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {filteredPosOrders.length > ITEMS_PER_PAGE && (
                <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                  <p className="text-sm text-slate-500">
                    Showing {((restaurantPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(restaurantPage * ITEMS_PER_PAGE, filteredPosOrders.length)} of {filteredPosOrders.length} results
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={restaurantPage === 1}
                      onClick={() => setRestaurantPage(p => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={restaurantPage * ITEMS_PER_PAGE >= filteredPosOrders.length}
                      onClick={() => setRestaurantPage(p => p + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* POS Order Receipt Modal */}
      {selectedPosOrder && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overflow-x-hidden bg-slate-900/60 backdrop-blur-sm p-4 py-10 print:p-0 print:bg-white print:block print:relative print:overflow-visible">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 my-auto print:shadow-none print:border-none print:rounded-none print:my-0 print:max-w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 rounded-t-2xl print:hidden">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Restaurant Bill</h3>
                <p className="text-sm text-slate-500">Order #{selectedPosOrder.id.substring(0, 8).toUpperCase()}</p>
              </div>
              <button 
                onClick={() => setSelectedPosOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-8 print:p-4">
              {/* Receipt Header for Print */}
              <div className="text-center mb-6 border-b border-dashed border-slate-300 pb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-1">{settings?.propertyName || 'Restaurant Name'}</h2>
                {settings?.address && <p className="text-sm text-slate-600">{settings.address}{settings?.city ? `, ${settings.city}` : ''}</p>}
                {settings?.gstin && <p className="text-sm text-slate-600 mt-1 font-medium">GSTIN: {settings.gstin}</p>}
                <p className="text-xs text-slate-500 mt-3 uppercase tracking-widest font-semibold">Tax Invoice / Bill of Supply</p>
                <h3 className="text-lg font-bold text-slate-800 mt-2">Order #{selectedPosOrder.id.substring(0, 8).toUpperCase()}</h3>
              </div>

              <div className="flex justify-between mb-6">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Date & Time</p>
                  <p className="font-semibold text-slate-900">{new Date(selectedPosOrder.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500 mb-1">Status</p>
                  {selectedPosOrder.paymentStatus === 'PAID_CASH' ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200 print:border print:border-green-800">
                      <CheckCircle2 className="w-3 h-3 mr-1 print:hidden" /> Paid (Cash)
                    </Badge>
                  ) : selectedPosOrder.paymentStatus === 'POSTED_TO_ROOM' ? (
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 print:border print:border-blue-800">
                      Posted to Room
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200 print:border print:border-amber-800">
                      Unpaid
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <table className="w-full text-sm">
                  <thead className="text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="pb-2 text-left font-medium">Item</th>
                      <th className="pb-2 text-right font-medium">Qty</th>
                      <th className="pb-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedPosOrder.items.map((item: any) => (
                      <tr key={item.id}>
                        <td className="py-3">
                          <div className="font-medium text-slate-800">{item.menuItem?.name || item.itemName}</div>
                          {item.selectedSize && <div className="text-xs text-slate-500">Size: {item.selectedSize}</div>}
                        </td>
                        <td className="py-3 text-right text-slate-600">{item.quantity}</td>
                        <td className="py-3 text-right font-medium text-slate-800">
                          ₹{(Number(item.unitPrice) * item.quantity).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="border-t border-slate-200 pt-4 flex justify-between items-center text-lg font-bold text-slate-900">
                <span>Grand Total</span>
                <span>₹{Number(selectedPosOrder.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="mt-8 flex justify-end space-x-3 print:hidden">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedPosOrder(null)}
                >
                  Close
                </Button>
                {(selectedPosOrder.paymentStatus === 'SETTLED' || selectedPosOrder.paymentStatus === 'PAID_CASH' || selectedPosOrder.paymentStatus === 'POSTED_TO_ROOM') && (
                  <Button
                    variant="outline"
                    onClick={handlePrint}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print Bill
                  </Button>
                )}
                {selectedPosOrder.paymentStatus === 'UNPAID' && (
                  <Button
                    onClick={() => handleSettlePosOrder(selectedPosOrder.id)}
                    disabled={isSettlingPos}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isSettlingPos ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Settle (Cash)
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal for Hotel */}
      {invoiceData && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overflow-x-hidden bg-slate-900/60 backdrop-blur-sm p-4 py-10 print:p-0 print:bg-white print:block print:relative print:overflow-visible">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-200 my-auto print:shadow-none print:border-none print:rounded-none print:my-0 print:max-w-full print:bg-white">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 rounded-t-2xl print:hidden">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Tax Invoice Preview</h3>
                <p className="text-sm text-slate-500">Folio #{invoiceData.folio.id.substring(0, 8).toUpperCase()}</p>
              </div>
              <button 
                onClick={() => setInvoiceData(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-10 print:p-8 bg-white">
              {/* Formal Invoice Header */}
              <div className="flex justify-between items-start mb-10 border-b border-slate-200 pb-8">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">{settings?.propertyName || 'Hotel Name'}</h2>
                  {settings?.address && <p className="text-sm text-slate-600">{settings.address}</p>}
                  {settings?.city && <p className="text-sm text-slate-600">{settings.city}</p>}
                  <p className="text-sm text-slate-600 mt-2">
                    {settings?.phone && <span className="mr-4">Phone: {settings.phone}</span>}
                    {settings?.email && <span>Email: {settings.email}</span>}
                  </p>
                  {settings?.gstin && <p className="text-sm font-semibold text-slate-800 mt-2">GSTIN: {settings.gstin}</p>}
                </div>
                <div className="text-right">
                  <h1 className="text-4xl font-bold text-slate-200 uppercase tracking-wider mb-2">Invoice</h1>
                  <p className="text-slate-900 font-semibold text-lg">{settings?.invoicePrefix || 'INV-'}{invoiceData.folio.id.substring(0, 6).toUpperCase()}</p>
                  <p className="text-sm text-slate-500 mt-1">Date & Time: {new Date().toLocaleString()}</p>
                </div>
              </div>

              <div className="flex justify-between mb-8">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Billed To</p>
                  <p className="font-bold text-lg text-slate-900">{invoiceData.breakdown.guestName}</p>
                  {invoiceData.breakdown.guestPhone && <p className="text-sm text-slate-600 font-medium">{invoiceData.breakdown.guestPhone}</p>}
                  {invoiceData.breakdown.guestEmail && <p className="text-sm text-slate-600">{invoiceData.breakdown.guestEmail}</p>}
                  {invoiceData.breakdown.guestAddress && <p className="text-sm text-slate-600 max-w-[250px]">{invoiceData.breakdown.guestAddress}</p>}
                  <p className="text-slate-600 mt-2">
                    Room {invoiceData.breakdown.roomNumber}
                    {invoiceData.breakdown.roomType ? ` - ${invoiceData.breakdown.roomType}` : invoiceData.breakdown.legacyType ? ` - ${invoiceData.breakdown.legacyType}` : ''}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">Check-in: {new Date(invoiceData.breakdown.checkInDate).toLocaleDateString()}</p>
                  <p className="text-sm text-slate-500">Check-out: {new Date(invoiceData.breakdown.checkOutDate).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Payment Status</p>
                  {invoiceData.folio.status === 'SETTLED' ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200 text-base py-1 px-3 print:border print:border-green-800">
                      <CheckCircle2 className="w-4 h-4 mr-1.5 print:hidden" /> Settled
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200 text-base py-1 px-3 print:border print:border-amber-800">
                      Payment Pending
                    </Badge>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg overflow-hidden border border-slate-200 print:bg-transparent">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-700 font-medium print:bg-slate-50">
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

                    <tr className="bg-slate-50 print:bg-transparent">
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
                  <tfoot className="bg-slate-50 font-semibold text-slate-900 border-t border-slate-300 print:bg-transparent">
                    <tr>
                      <td className="px-4 py-4 text-right text-base">
                         Grand Total
                      </td>
                      <td className="px-4 py-4 text-right text-lg text-blue-700 print:text-black">₹{Number(invoiceData.breakdown.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="mt-8 flex justify-end space-x-3 print:hidden">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInvoiceData(null)}
                >
                  Close
                </Button>
                {invoiceData.folio.status === 'SETTLED' && (
                  <Button
                    variant="outline"
                    onClick={handlePrint}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print Invoice
                  </Button>
                )}
                {invoiceData.folio.status !== 'SETTLED' && (
                  <Button
                    onClick={() => handleSettle(invoiceData.folio.id)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Mark as Settled
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog 
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
      />

      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={() => {
          if (confirmConfig.action === 'settle' && confirmConfig.id) {
            handleSettle(confirmConfig.id);
            setConfirmConfig({ ...confirmConfig, isOpen: false });
          }
        }}
        onCancel={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
      />
    </div>
  );
}
