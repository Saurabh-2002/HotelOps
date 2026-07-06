'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { Plus, Calendar, LogIn, LogOut, XCircle, Loader2, CalendarDays } from 'lucide-react';

type GuestRecord = {
  id: string;
  fullName: string;
  idType: string;
  idNumber: string;
};

type Room = {
  id: string;
  roomNumber: string;
  roomType: string;
};

type Booking = {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  status: 'RESERVED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
  room: Room;
  guestRecords: GuestRecord[];
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    roomId: '',
    checkInDate: '',
    checkOutDate: '',
    guestName: '',
    idType: 'Aadhaar',
    idNumber: '',
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [bookingsData, roomsData] = await Promise.all([
        apiFetch('/bookings'),
        apiFetch('/rooms')
      ]);
      setBookings(bookingsData);
      setRooms(roomsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        roomId: formData.roomId,
        checkInDate: new Date(formData.checkInDate).toISOString(),
        checkOutDate: new Date(formData.checkOutDate).toISOString(),
        guests: [{
          fullName: formData.guestName,
          idType: formData.idType,
          idNumber: formData.idNumber
        }]
      };
      await apiFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setIsModalOpen(false);
      setFormData({ roomId: '', checkInDate: '', checkOutDate: '', guestName: '', idType: 'Aadhaar', idNumber: '' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (id: string, action: 'check-in' | 'check-out' | 'cancel') => {
    const messages = {
      'check-in': 'Are you sure you want to check-in this booking?',
      'check-out': 'Are you sure you want to check-out? This will finalize the room stay.',
      'cancel': 'Are you sure you want to cancel this booking?'
    };
    if (!window.confirm(messages[action])) return;
    
    try {
      await apiFetch(`/bookings/${id}/${action}`, { method: 'POST' });
      fetchData();
    } catch (err: any) {
      if (action === 'check-out' && err.message && (err.message.includes('unsettled') || err.message.includes('UNPAID'))) {
        if (window.confirm(`${err.message}\n\nWould you like to go to Billing to settle the account now?`)) {
          window.location.href = '/dashboard/billing';
        }
      } else {
        alert(err.message || `Failed to ${action}`);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      RESERVED: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      CHECKED_IN: 'bg-green-50 text-green-700 border-green-200',
      CHECKED_OUT: 'bg-slate-100 text-slate-700 border-slate-200',
      CANCELLED: 'bg-red-50 text-red-700 border-red-200'
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Bookings</h3>
          <p className="text-slate-500 text-sm mt-1">Manage reservations, check-ins, and departures.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Booking
        </button>
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
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Guest</th>
                  <th className="px-6 py-4">Room</th>
                  <th className="px-6 py-4">Dates</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p>No bookings found. Create a reservation to get started.</p>
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => {
                    const primaryGuest = booking.guestRecords[0];
                    return (
                      <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{primaryGuest?.fullName || 'Unknown'}</div>
                          <div className="text-xs text-slate-500">{primaryGuest?.idType}: {primaryGuest?.idNumber}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">Room {booking.room.roomNumber}</div>
                          <div className="text-xs text-slate-500">{booking.room.roomType}</div>
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
                              <button 
                                onClick={() => handleAction(booking.id, 'check-in')}
                                title="Check In"
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                              >
                                <LogIn className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleAction(booking.id, 'cancel')}
                                title="Cancel Booking"
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {booking.status === 'CHECKED_IN' && (
                            <button 
                              onClick={() => handleAction(booking.id, 'check-out')}
                              title="Check Out"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            >
                              <LogOut className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">New Booking</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddBooking} className="p-6 space-y-5">
              
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Stay Details</h4>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Room</label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    value={formData.roomId}
                    onChange={(e) => setFormData({...formData, roomId: e.target.value})}
                  >
                    <option value="" disabled>Select a room...</option>
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>Room {r.roomNumber} ({r.roomType})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Check-in Date</label>
                    <input 
                      type="date" 
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      value={formData.checkInDate}
                      onChange={(e) => setFormData({...formData, checkInDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Check-out Date</label>
                    <input 
                      type="date" 
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      value={formData.checkOutDate}
                      onChange={(e) => setFormData({...formData, checkOutDate: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Primary Guest</h4>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g., John Doe"
                    value={formData.guestName}
                    onChange={(e) => setFormData({...formData, guestName: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ID Type</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                      value={formData.idType}
                      onChange={(e) => setFormData({...formData, idType: e.target.value})}
                    >
                      <option value="Aadhaar">Aadhaar</option>
                      <option value="PAN">PAN</option>
                      <option value="Passport">Passport</option>
                      <option value="Driving License">Driving License</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ID Number</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="e.g., 1234 5678 9012"
                      value={formData.idNumber}
                      onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Create Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
