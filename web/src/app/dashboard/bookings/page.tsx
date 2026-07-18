'use client';

import { Suspense, useState, useMemo } from 'react';
import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';
import { apiFetch, fetcher } from '@/lib/api';
import { Plus, Calendar, LogIn, LogOut, XCircle, Loader2, CalendarDays, Users, Baby, IndianRupee, X } from 'lucide-react';
import AlertDialog from '@/components/AlertDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { TableSkeleton } from '@/components/Skeletons';
import DatePicker from '@/components/DatePicker';
import { validateId } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

type GuestRecord = {
  id: string;
  fullName: string;
  idType: string;
  idNumber: string;
  phone: string;
  address: string;
  email?: string;
};

type RoomType = {
  id: string;
  name: string;
  baseOccupancy: number;
  maxAdults: number;
  maxChildren: number;
  baseRate: number;
  extraAdultRate: number;
  extraChildRate: number;
};

type Room = {
  id: string;
  roomNumber: string;
  baseRate: number;
  roomType?: RoomType;
  legacyType?: string;
};

type Booking = {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  status: 'RESERVED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
  room: Room;
  guestRecords: GuestRecord[];
};

function BookingsContent() {
  const searchParams = useSearchParams();
  const filterRoomId = searchParams.get('roomId');

  const endpoint = filterRoomId ? `/bookings?roomId=${filterRoomId}` : '/bookings';
  const { data: bookingsData, error: bookingsError, mutate: mutateBookings } = useSWR(endpoint, fetcher);
  const { data: roomsResponse } = useSWR('/rooms?limit=100', fetcher);

  const bookings: Booking[] = bookingsData || [];
  const rooms: Room[] = roomsResponse?.data || roomsResponse || [];
  const isLoading = !bookingsData && !bookingsError;
  const error = bookingsError ? bookingsError.message || 'Failed to load bookings' : '';
  
  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, title?: string, message: string, type: 'error'|'success'|'info'}>({ isOpen: false, message: '', type: 'info' });
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, message: string, action?: string, id?: string}>({ isOpen: false, title: '', message: '' });
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    roomId: '',
    checkInDate: '',
    checkOutDate: '',
    guests: [{ fullName: '', idType: 'Aadhaar', idNumber: '', phone: '', address: '', email: '' }],
    numAdults: 1,
    numChildren: 0,
  });

  // Derived: selected room and its type
  const selectedRoom = useMemo(() => rooms.find(r => r.id === formData.roomId), [rooms, formData.roomId]);
  const roomType = selectedRoom?.roomType;

  // Derived: number of nights
  const numNights = useMemo(() => {
    if (!formData.checkInDate || !formData.checkOutDate) return 0;
    const d1 = new Date(formData.checkInDate + 'T00:00:00');
    const d2 = new Date(formData.checkOutDate + 'T00:00:00');
    const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [formData.checkInDate, formData.checkOutDate]);

  // Derived: pricing breakdown
  const pricing = useMemo(() => {
    if (!selectedRoom || !roomType || numNights === 0) return null;
    const baseRate = Number(selectedRoom.baseRate || roomType.baseRate);
    const baseTotal = baseRate * numNights;
    const extraAdults = Math.max(0, formData.numAdults - roomType.baseOccupancy);
    const extraAdultTotal = extraAdults * Number(roomType.extraAdultRate) * numNights;
    const extraChildTotal = formData.numChildren * Number(roomType.extraChildRate) * numNights;
    const grandTotal = baseTotal + extraAdultTotal + extraChildTotal;
    return { baseRate, baseTotal, extraAdults, extraAdultTotal, extraChildTotal, grandTotal, numNights };
  }, [selectedRoom, roomType, numNights, formData.numAdults, formData.numChildren]);



  const handleAddBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all guest IDs
    for (let i = 0; i < formData.guests.length; i++) {
      const g = formData.guests[i];
      if (!g.fullName.trim()) {
        setAlertConfig({ isOpen: true, title: 'Validation Error', message: `Guest ${i + 1}: Full Name is required.`, type: 'error' });
        return;
      }
      if (!g.idNumber.trim()) {
        setAlertConfig({ isOpen: true, title: 'Validation Error', message: `Guest ${i + 1}: ID Number is required.`, type: 'error' });
        return;
      }
      if (!/^\d{10}$/.test(g.phone.trim())) {
        setAlertConfig({ isOpen: true, title: 'Validation Error', message: `Guest ${i + 1}: Phone Number must be exactly 10 digits.`, type: 'error' });
        return;
      }
      if (!g.address.trim()) {
        setAlertConfig({ isOpen: true, title: 'Validation Error', message: `Guest ${i + 1}: Address is required.`, type: 'error' });
        return;
      }
      const validation = validateId(g.idType, g.idNumber);
      if (!validation.isValid) {
        setAlertConfig({ isOpen: true, title: 'Validation Error', message: `Guest ${i + 1}: ${validation.error}`, type: 'error' });
        return;
      }
    }

    if (roomType && formData.numAdults > roomType.maxAdults) {
      setAlertConfig({ isOpen: true, title: 'Capacity Exceeded', message: `Maximum ${roomType.maxAdults} adults allowed for this room type.`, type: 'error' });
      return;
    }
    if (roomType && formData.numChildren > roomType.maxChildren) {
      setAlertConfig({ isOpen: true, title: 'Capacity Exceeded', message: `Maximum ${roomType.maxChildren} children allowed for this room type.`, type: 'error' });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        roomId: formData.roomId,
        checkInDate: new Date(formData.checkInDate + 'T00:00:00').toISOString(),
        checkOutDate: new Date(formData.checkOutDate + 'T00:00:00').toISOString(),
        numAdults: formData.numAdults,
        numChildren: formData.numChildren,
        guests: formData.guests
      };
      const promise = apiFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      mutateBookings(async () => {
        await promise;
        return undefined;
      }, {
        optimisticData: (currentData: any) => {
          if (!currentData) return currentData;
          return [{
            id: `temp-${Date.now()}`,
            checkInDate: payload.checkInDate,
            checkOutDate: payload.checkOutDate,
            status: 'RESERVED',
            room: selectedRoom,
            guestRecords: payload.guests.map((g: any, i: number) => ({
              id: `temp-guest-${i}`,
              fullName: g.fullName,
              idType: g.idType,
              idNumber: g.idNumber,
              phone: g.phone,
              address: g.address,
              email: g.email
            }))
          }, ...currentData];
        },
        rollbackOnError: true,
        revalidate: true
      });
      
      setIsModalOpen(false);
      setFormData({ roomId: '', checkInDate: '', checkOutDate: '', guests: [{ fullName: '', idType: 'Aadhaar', idNumber: '', phone: '', address: '', email: '' }], numAdults: 1, numChildren: 0 });

    } catch (err: any) {
      setAlertConfig({ isOpen: true, title: 'Error', message: err.message || 'Failed to create booking', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (id: string, action: 'check-in' | 'check-out' | 'cancel') => {
    const titles = {
      'check-in': 'Confirm Check In',
      'check-out': 'Confirm Check Out',
      'cancel': 'Confirm Cancellation'
    };
    const messages = {
      'check-in': 'Are you sure you want to check-in this booking?',
      'check-out': 'Are you sure you want to check-out? This will finalize the room stay.',
      'cancel': 'Are you sure you want to cancel this booking?'
    };
    
    setConfirmConfig({
      isOpen: true,
      title: titles[action],
      message: messages[action],
      action,
      id
    });
  };

  const processAction = async () => {
    if (!confirmConfig.action) return;
    const { id, action } = confirmConfig;
    
    if (action === 'redirect-billing') {
      window.location.href = '/dashboard/billing';
      return;
    }
    
    if (!id) return;
    
    setConfirmConfig({ ...confirmConfig, isOpen: false });
    
    try {
      await apiFetch(`/bookings/${id}/${action}`, { method: 'POST' });
      mutateBookings();
      setAlertConfig({ isOpen: true, title: 'Success', message: `Successfully completed ${action}`, type: 'success' });
    } catch (err: any) {
      if (action === 'check-out' && err.message && (err.message.includes('unsettled') || err.message.includes('UNPAID'))) {
        setConfirmConfig({
          isOpen: true,
          title: 'Unsettled Account',
          message: `${err.message}\n\nWould you like to go to Billing to settle the account now?`,
          action: 'redirect-billing',
        });
      } else {
        setAlertConfig({ isOpen: true, title: 'Error', message: err.message || `Failed to ${action}`, type: 'error' });
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      RESERVED: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-transparent',
      CHECKED_IN: 'bg-green-50 text-green-700 hover:bg-green-100 border-transparent',
      CHECKED_OUT: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent',
      CANCELLED: 'bg-red-50 text-red-700 hover:bg-red-100 border-transparent'
    };
    return (
      <Badge className={styles[status]}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Bookings</h3>
          <p className="text-slate-500 text-sm mt-1">Manage reservations, check-ins, and departures.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Booking
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
          {bookings.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500">
              <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p>No bookings found. Create a reservation to get started.</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View (< 640px) */}
              <div className="sm:hidden flex flex-col divide-y divide-slate-100">
                {bookings.map((booking) => {
                  const primaryGuest = booking.guestRecords[0];
                  return (
                    <div key={booking.id} className="p-4 flex flex-col space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-lg">{primaryGuest?.fullName || 'Unknown'}</span>
                          <span className="text-xs text-slate-500 mt-0.5">Room {booking.room.roomNumber} · {booking.room.roomType?.name || booking.room.legacyType || '—'}</span>
                        </div>
                        {getStatusBadge(booking.status)}
                      </div>
                      
                      <div className="flex items-center text-sm text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                        {new Date(booking.checkInDate).toLocaleDateString()} - {new Date(booking.checkOutDate).toLocaleDateString()}
                      </div>
                      
                      <div className="flex justify-end pt-1 border-t border-slate-50 gap-2">
                        {booking.status === 'RESERVED' && (
                          <>
                            <Button variant="outline" size="sm" className="h-8 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200" onClick={() => handleAction(booking.id, 'cancel')}>Cancel</Button>
                            <Button variant="outline" size="sm" className="h-8 text-xs text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 border-emerald-200" onClick={() => handleAction(booking.id, 'check-in')}>Check In</Button>
                          </>
                        )}
                        {booking.status === 'CHECKED_IN' && (
                          <Button variant="outline" size="sm" className="h-8 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700 border-blue-200" onClick={() => handleAction(booking.id, 'check-out')}>Check Out</Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View (>= 640px) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200 whitespace-nowrap">
                    <tr>
                      <th className="px-6 py-4">Guest</th>
                      <th className="px-6 py-4">Room</th>
                      <th className="px-6 py-4">Dates</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings.map((booking) => {
                      const primaryGuest = booking.guestRecords[0];
                      return (
                        <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-900">{primaryGuest?.fullName || 'Unknown'}</div>
                            <div className="text-xs text-slate-500">{primaryGuest?.idType}: {primaryGuest?.idNumber}</div>
                          </td>
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
                            {getStatusBadge(booking.status)}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            {booking.status === 'RESERVED' && (
                              <>
                                <Button 
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleAction(booking.id, 'check-in')}
                                  title="Check In"
                                  className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                >
                                  <LogIn className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleAction(booking.id, 'cancel')}
                                  title="Cancel Booking"
                                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {booking.status === 'CHECKED_IN' && (
                              <Button 
                                variant="ghost"
                                size="icon"
                                onClick={() => handleAction(booking.id, 'check-out')}
                                title="Check Out"
                                className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                              >
                                <LogOut className="w-4 h-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* New Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="relative w-full max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200 animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-2xl">
              <h3 className="text-lg font-semibold text-slate-900">
                New Booking
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddBooking} className="overflow-y-auto p-6 space-y-6">
              
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Stay Details</h4>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Room <span className="text-rose-500">*</span></label>
                  <Select
                    value={formData.roomId}
                    onChange={(e) => setFormData({...formData, roomId: e.target.value, numAdults: 1, numChildren: 0, guests: [{ fullName: '', idType: 'Aadhaar', idNumber: '', phone: '', address: '', email: '' }]})}
                  >
                    <option value="" disabled>Select a room...</option>
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>Room {r.roomNumber} ({r.roomType?.name || r.legacyType || '—'})</option>
                    ))}
                  </Select>
                  {roomType && (
                    <p className="mt-1.5 text-xs text-slate-500">
                      Capacity: {roomType.baseOccupancy} base · max {roomType.maxAdults} adults, {roomType.maxChildren} children
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Check-in Date <span className="text-rose-500">*</span></label>
                    <DatePicker
                      value={formData.checkInDate}
                      onChange={(val) => setFormData({...formData, checkInDate: val})}
                      placeholder="Select check-in"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Check-out Date <span className="text-rose-500">*</span></label>
                    <DatePicker
                      value={formData.checkOutDate}
                      onChange={(val) => setFormData({...formData, checkOutDate: val})}
                      placeholder="Select check-out"
                      minDate={formData.checkInDate || undefined}
                    />
                  </div>
                </div>

                {/* Guest Count */}
                {roomType && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        <span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Adults <span className="text-rose-500">*</span></span>
                      </label>
                      <Select
                        value={formData.numAdults}
                        onChange={(e) => {
                          const newCount = parseInt(e.target.value);
                          const newGuests = [...formData.guests];
                          if (newCount > newGuests.length) {
                            for (let i = newGuests.length; i < newCount; i++) {
                              newGuests.push({ fullName: '', idType: 'Aadhaar', idNumber: '', phone: '', address: '', email: '' });
                            }
                          } else if (newCount < newGuests.length) {
                            newGuests.length = newCount;
                          }
                          setFormData({...formData, numAdults: newCount, guests: newGuests});
                        }}
                      >
                        {Array.from({ length: roomType.maxAdults }, (_, i) => i + 1).map(n => (
                          <option key={n} value={n}>{n}{n > roomType.baseOccupancy ? ' (extra charge)' : ''}</option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        <span className="inline-flex items-center gap-1.5"><Baby className="w-3.5 h-3.5" /> Children</span>
                      </label>
                      <Select
                        value={formData.numChildren}
                        onChange={(e) => setFormData({...formData, numChildren: parseInt(e.target.value)})}
                      >
                        {Array.from({ length: roomType.maxChildren + 1 }, (_, i) => i).map(n => (
                          <option key={n} value={n}>{n}{n > 0 ? ' (extra charge)' : ''}</option>
                        ))}
                      </Select>
                    </div>
                  </div>
                )}

                {/* Price Breakdown */}
                {pricing && (
                  <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 border border-slate-200 rounded-xl p-4 space-y-2">
                    <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <IndianRupee className="w-3.5 h-3.5" /> Price Breakdown ({pricing.numNights} night{pricing.numNights > 1 ? 's' : ''})
                    </h5>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between text-slate-600">
                        <span>Base Rate × {pricing.numNights} night{pricing.numNights > 1 ? 's' : ''}</span>
                        <span>₹{pricing.baseTotal.toLocaleString()}</span>
                      </div>
                      {pricing.extraAdults > 0 && (
                        <div className="flex justify-between text-amber-700">
                          <span>Extra Adult × {pricing.extraAdults} × {pricing.numNights} night{pricing.numNights > 1 ? 's' : ''}</span>
                          <span>+ ₹{pricing.extraAdultTotal.toLocaleString()}</span>
                        </div>
                      )}
                      {formData.numChildren > 0 && Number(roomType?.extraChildRate) > 0 && (
                        <div className="flex justify-between text-amber-700">
                          <span>Extra Child × {formData.numChildren} × {pricing.numNights} night{pricing.numNights > 1 ? 's' : ''}</span>
                          <span>+ ₹{pricing.extraChildTotal.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200">
                        <span>Estimated Total</span>
                        <span>₹{pricing.grandTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Guest Details</h4>
                <div className="space-y-4">
                  {formData.guests.map((guest, index) => {
                    const validation = guest.idNumber ? validateId(guest.idType, guest.idNumber) : null;
                    const isInvalid = validation && !validation.isValid;
                    const hint = validation?.hint || validateId(guest.idType, '').hint; // Get hint even when empty
                    
                    return (
                      <div key={index} className={`p-4 rounded-xl border ${index === 0 ? 'bg-blue-50/30 border-blue-100' : 'bg-slate-50 border-slate-200'}`}>
                        <h5 className="text-xs font-semibold text-slate-700 uppercase mb-3 flex justify-between items-center">
                          <span>{index === 0 ? 'Primary Guest' : `Guest ${index + 1}`}</span>
                          {index === 0 && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">REQUIRED</span>}
                        </h5>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Full Name <span className="text-rose-500">*</span></label>
                            <Input 
                              type="text" 
                              required
                              placeholder="e.g., John Doe"
                              value={guest.fullName}
                              onChange={(e) => {
                                const newGuests = [...formData.guests];
                                newGuests[index].fullName = e.target.value;
                                setFormData({...formData, guests: newGuests});
                              }}
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">ID Type <span className="text-rose-500">*</span></label>
                              <Select
                                value={guest.idType}
                                onChange={(e) => {
                                  const newGuests = [...formData.guests];
                                  newGuests[index].idType = e.target.value;
                                  newGuests[index].idNumber = ''; // clear on change to re-validate cleanly
                                  setFormData({...formData, guests: newGuests});
                                }}
                              >
                                <option value="Aadhaar">Aadhaar</option>
                                <option value="PAN">PAN</option>
                                <option value="Passport">Passport</option>
                                <option value="Driving License">Driving License</option>
                              </Select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">ID Number <span className="text-rose-500">*</span></label>
                              <Input 
                                type="text" 
                                required
                                className={`${
                                  isInvalid 
                                    ? 'border-red-300 focus-visible:ring-red-500 bg-red-50/30' 
                                    : guest.idNumber && validation?.isValid
                                      ? 'border-green-400 focus-visible:ring-green-500 bg-green-50/30'
                                      : ''
                                }`}
                                placeholder="ID Number"
                                value={guest.idNumber}
                                onChange={(e) => {
                                  const newGuests = [...formData.guests];
                                  newGuests[index].idNumber = e.target.value;
                                  setFormData({...formData, guests: newGuests});
                                }}
                              />
                              {isInvalid && (
                                <p className="mt-1 text-[11px] text-red-600 font-medium">{validation.error}</p>
                              )}
                                {(!guest.idNumber || isInvalid) && hint && (
                                  <p className="mt-1 text-[10px] text-slate-400">{hint}</p>
                                )}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number <span className="text-rose-500">*</span></label>
                                <Input 
                                  type="text" 
                                  required
                                  maxLength={10}
                                  placeholder="e.g., 9876543210"
                                  value={guest.phone}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    const newGuests = [...formData.guests];
                                    newGuests[index].phone = val;
                                    setFormData({...formData, guests: newGuests});
                                  }}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Email Address <span className="text-slate-400 font-normal">(Optional)</span></label>
                                <Input 
                                  type="email" 
                                  placeholder="e.g., guest@email.com"
                                  value={guest.email}
                                  onChange={(e) => {
                                    const newGuests = [...formData.guests];
                                    newGuests[index].email = e.target.value;
                                    setFormData({...formData, guests: newGuests});
                                  }}
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Full Address <span className="text-rose-500">*</span></label>
                              <Input 
                                type="text" 
                                required
                                placeholder="e.g., 123 Main St, City, State"
                                value={guest.address}
                                onChange={(e) => {
                                  const newGuests = [...formData.guests];
                                  newGuests[index].address = e.target.value;
                                  setFormData({...formData, guests: newGuests});
                                }}
                              />
                            </div>
                          </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-6 flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.checkInDate || !formData.checkOutDate || formData.guests.some(g => !g.idNumber || !validateId(g.idType, g.idNumber).isValid)}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Create Booking
                </Button>
              </div>
            </form>
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
        onConfirm={processAction}
        onCancel={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
      />
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={5} />}>
      <BookingsContent />
    </Suspense>
  );
}
