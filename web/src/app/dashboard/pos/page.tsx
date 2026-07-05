'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { Plus, Trash2, Loader2, UtensilsCrossed, ReceiptText, Coffee, Save, LogIn } from 'lucide-react';

type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: string;
  isAvailable: boolean;
};

type Booking = {
  id: string;
  room: { roomNumber: string };
  guestRecords: { fullName: string }[];
};

type OrderItem = {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
};

export default function PosPage() {
  const [activeTab, setActiveTab] = useState<'TERMINAL' | 'MENU'>('TERMINAL');
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Menu Setup State
  const [newMenuData, setNewMenuData] = useState({ name: '', category: 'Starters', price: '' });
  
  // Terminal State
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [menuData, bookingsData] = await Promise.all([
        apiFetch('/pos/menu'),
        apiFetch('/bookings')
      ]);
      setMenuItems(menuData);
      setActiveBookings(bookingsData.filter((b: any) => b.status === 'CHECKED_IN'));
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/pos/menu', {
        method: 'POST',
        body: JSON.stringify({
          ...newMenuData,
          price: Number(newMenuData.price)
        }),
      });
      setNewMenuData({ name: '', category: 'Starters', price: '' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to add menu item');
    }
  };

  const addToOrder = (item: MenuItem) => {
    setOrderItems(prev => {
      const existing = prev.find(p => p.menuItem.id === item.id);
      if (existing) {
        return prev.map(p => p.menuItem.id === item.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { menuItem: item, quantity: 1, notes: '' }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setOrderItems(prev => {
      return prev.map(p => {
        if (p.menuItem.id === itemId) {
          const newQ = p.quantity + delta;
          return newQ > 0 ? { ...p, quantity: newQ } : p;
        }
        return p;
      }).filter(p => p.quantity > 0);
    });
  };

  const handleSubmitOrder = async () => {
    if (orderItems.length === 0) return;
    setIsSubmittingOrder(true);
    try {
      await apiFetch('/pos/orders', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: selectedBookingId || null,
          items: orderItems.map(item => ({
            menuItemId: item.menuItem.id,
            quantity: item.quantity,
            notes: item.notes
          }))
        }),
      });
      alert('KOT Generated Successfully!');
      setOrderItems([]);
      setSelectedBookingId('');
    } catch (err: any) {
      alert(err.message || 'Failed to generate order');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const categories = ['All', ...Array.from(new Set(menuItems.map(m => m.category)))];
  const filteredMenu = activeCategory === 'All' ? menuItems : menuItems.filter(m => m.category === activeCategory);
  
  const orderTotal = orderItems.reduce((sum, item) => sum + (Number(item.menuItem.price) * item.quantity), 0);

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Restaurant POS</h3>
          <p className="text-slate-500 text-sm mt-1">Manage orders and room service.</p>
        </div>
        <div className="flex bg-slate-200 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('TERMINAL')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'TERMINAL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Terminal
          </button>
          <button
            onClick={() => setActiveTab('MENU')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'MENU' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Menu Setup
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : activeTab === 'MENU' ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 max-w-4xl">
          <h4 className="text-lg font-semibold text-slate-900 mb-6 border-b border-slate-100 pb-4">Add Menu Item</h4>
          <form onSubmit={handleAddMenuItem} className="flex gap-4 items-end mb-8">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Item Name</label>
              <input type="text" required value={newMenuData.name} onChange={e => setNewMenuData({...newMenuData, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., Paneer Tikka" />
            </div>
            <div className="w-48">
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <input type="text" required value={newMenuData.category} onChange={e => setNewMenuData({...newMenuData, category: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., Starters" />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium text-slate-700 mb-1">Price (₹)</label>
              <input type="number" required min="0" value={newMenuData.price} onChange={e => setNewMenuData({...newMenuData, price: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="250" />
            </div>
            <button type="submit" className="px-4 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors h-[42px]">
              Add Item
            </button>
          </form>

          <h4 className="text-lg font-semibold text-slate-900 mb-4">Current Menu</h4>
          <div className="grid grid-cols-2 gap-4">
            {menuItems.map(item => (
              <div key={item.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg bg-slate-50">
                <div>
                  <div className="font-medium text-slate-900">{item.name}</div>
                  <div className="text-xs text-slate-500">{item.category}</div>
                </div>
                <div className="font-semibold text-slate-700">₹{Number(item.price)}</div>
              </div>
            ))}
            {menuItems.length === 0 && (
              <div className="col-span-2 text-center text-slate-500 py-8">No menu items configured yet.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex gap-6 overflow-hidden min-h-[500px]">
          {/* Left: Menu Grid */}
          <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex overflow-x-auto p-4 border-b border-slate-100 gap-2 shrink-0">
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setActiveCategory(c)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeCategory === c ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMenu.map(item => (
                  <button
                    key={item.id}
                    onClick={() => addToOrder(item)}
                    className="flex flex-col items-start p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-300 hover:shadow-md transition-all text-left group"
                  >
                    <div className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors line-clamp-2">{item.name}</div>
                    <div className="mt-2 text-blue-600 font-bold bg-blue-50 px-2.5 py-1 rounded-md text-sm">
                      ₹{Number(item.price)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Current Order (KOT) */}
          <div className="w-96 flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm shrink-0">
            <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex items-center justify-between">
              <h4 className="font-bold text-slate-800 flex items-center">
                <ReceiptText className="w-5 h-5 mr-2 text-slate-500" />
                Current Order
              </h4>
            </div>

            <div className="p-4 border-b border-slate-100">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Assign To Room</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                value={selectedBookingId}
                onChange={(e) => setSelectedBookingId(e.target.value)}
              >
                <option value="">Walk-in (Cash Order)</option>
                {activeBookings.map(b => (
                  <option key={b.id} value={b.id}>
                    Room {b.room.roomNumber} - {b.guestRecords[0]?.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
              {orderItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <UtensilsCrossed className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm">Select items from the menu</p>
                </div>
              ) : (
                orderItems.map((item) => (
                  <div key={item.menuItem.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex-1 pr-3">
                      <div className="font-medium text-slate-800 text-sm">{item.menuItem.name}</div>
                      <div className="text-xs text-slate-500">₹{Number(item.menuItem.price)}</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center bg-slate-100 rounded-md">
                        <button onClick={() => updateQuantity(item.menuItem.id, -1)} className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded-l-md font-medium">-</button>
                        <div className="w-6 text-center text-sm font-semibold">{item.quantity}</div>
                        <button onClick={() => updateQuantity(item.menuItem.id, 1)} className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded-r-md font-medium">+</button>
                      </div>
                      <div className="w-14 text-right font-bold text-slate-700 text-sm">
                        ₹{Number(item.menuItem.price) * item.quantity}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-600 font-medium">Subtotal</span>
                <span className="text-xl font-bold text-slate-900">₹{orderTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <button
                onClick={handleSubmitOrder}
                disabled={orderItems.length === 0 || isSubmittingOrder}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
              >
                {isSubmittingOrder ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                {selectedBookingId ? 'Post to Room & Print KOT' : 'Pay Cash & Print KOT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
