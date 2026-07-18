'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { apiFetch, fetcher } from '@/lib/api';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Loader2, BedDouble, CheckCircle2, XCircle, Search, CalendarDays, Info, Hash, Tag, Layers, IndianRupee, Activity, Wrench, X } from 'lucide-react';
import { TableSkeleton } from '@/components/Skeletons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type RoomType = {
  id: string;
  name: string;
  baseRate: number;
};

type Room = {
  id: string;
  roomNumber: string;
  roomTypeId?: string;
  roomType?: RoomType;
  legacyType?: string;
  floor: string;
  baseRate: number;
  status: string;
  maintenanceNotes?: string;
  bookings?: { id: string, status: string }[];
};

export default function RoomsPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Pagination & Search state
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
  const { data: roomsResponse, error: roomsError, mutate: mutateRooms } = useSWR(`/rooms?page=${currentPage}&limit=10${searchParam}`, fetcher);
  const { data: roomTypesData } = useSWR('/room-types', fetcher);

  const rooms: Room[] = roomsResponse?.data || [];
  const totalPages = roomsResponse?.totalPages || 1;
  const roomTypes: RoomType[] = roomTypesData || [];
  const isLoading = !roomsResponse && !roomsError;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    roomNumber: '',
    roomTypeId: '',
    floor: '1',
    baseRate: '',
    status: 'CLEAN',
    maintenanceNotes: '',
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== searchInput) {
        setSearchQuery(searchInput);
        setCurrentPage(1); // Reset to page 1 on new search
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, searchQuery]);

  const handleOpenModal = (room?: Room) => {
    if (room) {
      setEditingRoomId(room.id);
      setFormData({
        roomNumber: room.roomNumber,
        roomTypeId: room.roomTypeId || '',
        floor: room.floor || '1',
        baseRate: room.baseRate.toString(),
        status: room.status || 'CLEAN',
        maintenanceNotes: room.maintenanceNotes || '',
      });
    } else {
      setEditingRoomId(null);
      setFormData({ roomNumber: '', roomTypeId: '', floor: '1', baseRate: '', status: 'CLEAN', maintenanceNotes: '' });
    }
    setIsModalOpen(true);
    setError('');
    setSuccess('');
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      const payload: any = {
        roomNumber: formData.roomNumber,
        floor: formData.floor,
        baseRate: Number(formData.baseRate),
        status: formData.status,
      };
      
      if (formData.status === 'OUT_OF_ORDER') {
        payload.maintenanceNotes = formData.maintenanceNotes;
      } else {
        payload.maintenanceNotes = null;
      }
      
      if (formData.roomTypeId) {
        payload.roomTypeId = formData.roomTypeId;
      }
      
      const endpoint = editingRoomId ? `/rooms/${editingRoomId}` : '/rooms';
      const method = editingRoomId ? 'PATCH' : 'POST';
      
      const promise = apiFetch(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      mutateRooms(async () => {
        await promise;
        return undefined;
      }, {
        optimisticData: (currentData: any) => {
          if (!currentData) return currentData;
          const currentRooms = currentData.data || [];
          const selectedRoomType = roomTypes.find(rt => rt.id === payload.roomTypeId);
          
          if (editingRoomId) {
            return {
              ...currentData,
              data: currentRooms.map((r: any) => r.id === editingRoomId ? { ...r, ...payload, roomType: selectedRoomType } : r)
            };
          } else {
            return {
              ...currentData,
              data: [{ id: `temp-${Date.now()}`, ...payload, roomType: selectedRoomType }, ...currentRooms]
            };
          }
        },
        rollbackOnError: true,
        revalidate: true
      });
      
      setIsModalOpen(false);
      setSuccess(editingRoomId ? 'Room updated successfully!' : 'Room created successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to save room');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    setRoomToDelete(id);
  };

  const confirmDelete = async () => {
    if (!roomToDelete) return;
    setError('');
    setSuccess('');
    
    try {
      const promise = apiFetch(`/rooms/${roomToDelete}`, { method: 'DELETE' });
      
      mutateRooms(async () => {
        await promise;
        if (rooms.length === 1 && currentPage > 1) {
          setCurrentPage(p => p - 1);
        }
        return undefined;
      }, {
        optimisticData: (currentData: any) => {
          if (!currentData) return currentData;
          return {
            ...currentData,
            data: currentData.data.filter((r: any) => r.id !== roomToDelete)
          };
        },
        rollbackOnError: true,
        revalidate: true
      });

      setSuccess('Room deleted successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to delete room');
    } finally {
      setRoomToDelete(null);
    }
  };

  const getRoomTypeName = (room: Room) => {
    if (room.roomType?.name) return room.roomType.name;
    if (room.legacyType) return room.legacyType;
    return '—';
  };

  // Auto-clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Rooms</h3>
          <p className="text-slate-500 text-sm mt-1">Manage your property&apos;s inventory and base rates.</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Room
        </Button>
      </div>

      {/* Inline Notifications */}
      {error && (
        <div className="flex items-center p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 shadow-sm animate-in fade-in slide-in-from-top-4">
          <XCircle className="w-5 h-5 mr-3 text-red-500" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="flex items-center p-4 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 shadow-sm animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-500" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <Input
          className="pl-10"
          placeholder="Search by room number..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
          {rooms.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500">
              <BedDouble className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p>
                {searchQuery 
                  ? `No rooms found matching "${searchQuery}".` 
                  : 'No rooms found. Add your first room to get started.'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View (< 640px) */}
              <div className="sm:hidden flex flex-col divide-y divide-slate-100">
                {rooms.map((room) => (
                  <div key={room.id} className="p-4 flex flex-col space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-lg">
                          {room.bookings && room.bookings.length > 0 ? (
                            <Link 
                              href={`/dashboard/bookings?roomId=${room.id}`} 
                              className="text-blue-600 flex items-center"
                            >
                              Room {room.roomNumber} <span className="ml-2 w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                            </Link>
                          ) : (
                            `Room ${room.roomNumber}`
                          )}
                        </span>
                        <span className="text-xs text-slate-500 mt-0.5">{getRoomTypeName(room)} · Floor {room.floor || '—'}</span>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        room.status === 'CLEAN' ? 'bg-emerald-100 text-emerald-800' :
                        room.status === 'DIRTY' ? 'bg-amber-100 text-amber-800' :
                        room.status === 'OUT_OF_ORDER' ? 'bg-rose-100 text-rose-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {room.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between items-end pt-1 border-t border-slate-50">
                      <span className="font-semibold text-slate-900">₹{Number(room.baseRate).toLocaleString()}</span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => handleOpenModal(room)}>Edit</Button>
                        <Button variant="outline" size="sm" className="h-8 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => setRoomToDelete(room.id)}>Delete</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (>= 640px) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200 whitespace-nowrap">
                    <tr>
                      <th className="px-6 py-4"><div className="flex items-center gap-2"><Hash className="w-4 h-4 text-slate-400" /> Room No.</div></th>
                      <th className="px-6 py-4"><div className="flex items-center gap-2"><Tag className="w-4 h-4 text-slate-400" /> Type</div></th>
                      <th className="px-6 py-4"><div className="flex items-center gap-2"><Layers className="w-4 h-4 text-slate-400" /> Floor</div></th>
                      <th className="px-6 py-4"><div className="flex items-center gap-2"><IndianRupee className="w-4 h-4 text-slate-400" /> Base Rate</div></th>
                      <th className="px-6 py-4"><div className="flex items-center gap-2"><Activity className="w-4 h-4 text-slate-400" /> Status</div></th>
                      <th className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-2"><Wrench className="w-4 h-4 text-slate-400" /> Actions</div></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rooms.map((room) => (
                      <tr key={room.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {room.bookings && room.bookings.length > 0 ? (
                            <Link 
                              href={`/dashboard/bookings?roomId=${room.id}`} 
                              className="text-blue-600 hover:text-blue-700 hover:underline flex items-center group transition-colors"
                              title="View Active Booking"
                            >
                              {room.roomNumber}
                              <span className="ml-2 relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                              </span>
                            </Link>
                          ) : (
                            room.roomNumber
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="secondary">
                            {getRoomTypeName(room)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">{room.floor || '—'}</td>
                        <td className="px-6 py-4 font-medium">₹{Number(room.baseRate).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            room.status === 'CLEAN' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            room.status === 'DIRTY' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            room.status === 'OUT_OF_ORDER' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                            'bg-slate-50 text-slate-700 border-slate-200'
                          }`}>
                            {room.status.replace(/_/g, ' ')}
                            {room.status === 'OUT_OF_ORDER' && room.maintenanceNotes && (
                              <div className="relative group flex items-center justify-center">
                                <Info className="w-3.5 h-3.5 text-rose-400 group-hover:text-rose-600 transition-colors cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] bg-slate-900 text-white text-xs rounded shadow-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-pre-wrap text-center font-normal tracking-normal">
                                  {room.maintenanceNotes}
                                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                                </div>
                              </div>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleOpenModal(room)}
                            title="Edit Room"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setRoomToDelete(room.id)}
                            title="Delete Room"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50 rounded-b-xl">
              <span className="text-sm text-slate-500 font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <div className="space-x-2">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  Previous
                </button>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200 animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-2xl">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingRoomId ? 'Edit Room' : 'Add New Room'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-1 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveRoom} className="overflow-y-auto p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Room Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Hash className="w-4 h-4 text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    required 
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-shadow shadow-sm" 
                    placeholder="e.g., 101" 
                    value={formData.roomNumber} 
                    onChange={(e) => setFormData({...formData, roomNumber: e.target.value})} 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Room Type</label>
                {roomTypes.length > 0 ? (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Tag className="w-4 h-4 text-slate-400" />
                    </div>
                    <select 
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm transition-shadow shadow-sm" 
                      value={formData.roomTypeId} 
                      onChange={(e) => {
                        const selectedType = roomTypes.find(rt => rt.id === e.target.value);
                        setFormData({
                          ...formData, 
                          roomTypeId: e.target.value,
                          baseRate: selectedType ? String(Number(selectedType.baseRate)) : formData.baseRate
                        });
                      }}
                    >
                      <option value="">Select a room type...</option>
                      {roomTypes.map(rt => (
                        <option key={rt.id} value={rt.id}>{rt.name} — ₹{Number(rt.baseRate).toLocaleString()}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    No room types defined yet. Go to <strong className="font-semibold">Room Types</strong> to create one first.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Floor</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Layers className="w-4 h-4 text-slate-400" />
                    </div>
                    <input 
                      type="text" 
                      required 
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-shadow shadow-sm" 
                      placeholder="e.g., 1" 
                      value={formData.floor} 
                      onChange={(e) => setFormData({...formData, floor: e.target.value})} 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Base Rate (₹)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <IndianRupee className="w-4 h-4 text-slate-400" />
                    </div>
                    <input 
                      type="number" 
                      required 
                      min="0" 
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-shadow shadow-sm" 
                      placeholder="2500" 
                      value={formData.baseRate} 
                      onChange={(e) => setFormData({...formData, baseRate: e.target.value})} 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Activity className="w-4 h-4 text-slate-400" />
                    </div>
                    <select
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-shadow shadow-sm bg-white"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="CLEAN">Clean</option>
                      <option value="DIRTY">Dirty</option>
                      <option value="OUT_OF_ORDER">Out of Order</option>
                    </select>
                  </div>
                </div>
              </div>

              {formData.status === 'OUT_OF_ORDER' && (
                <div className="mt-4 animate-in slide-in-from-top-2 duration-200 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Maintenance Notes / Reason <span className="text-rose-500">*</span></label>
                  <textarea
                    rows={2}
                    required
                    className="w-full px-3 py-2 border border-slate-300 bg-white rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none text-sm transition-shadow shadow-sm"
                    placeholder="e.g., AC not cooling, plumbing issue..."
                    value={formData.maintenanceNotes}
                    onChange={(e) => setFormData({...formData, maintenanceNotes: e.target.value})}
                  />
                </div>
              )}

              <div className="pt-5 mt-2 flex justify-end space-x-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center shadow-sm"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingRoomId ? 'Update Room' : 'Save Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {roomToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 p-6 animate-in zoom-in-95 duration-200 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Room</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete this room? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setRoomToDelete(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
