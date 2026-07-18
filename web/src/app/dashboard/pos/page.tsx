'use client';

import useSWR from 'swr';
import { apiFetch, fetcher } from '@/lib/api';
import { useState } from 'react';
import { Plus, Pencil, Trash2, UtensilsCrossed } from 'lucide-react';
import AlertDialog from '@/components/AlertDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { CardGridSkeleton } from '@/components/Skeletons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

import MenuItemForm from './components/MenuItemForm';
import type { MenuItemFormData } from './components/MenuItemForm';
import MenuItemCard from './components/MenuItemCard';
import OrderCustomizationModal from './components/OrderCustomizationModal';
import type { OrderItemSelection } from './components/OrderCustomizationModal';
import CurrentOrderPanel from './components/CurrentOrderPanel';

type MenuItem = {
  id: string;
  itemCode?: string;
  name: string;
  category: string;
  subcategory?: string;
  price: string;
  sizes?: string[];
  sizePricing?: Record<string, number>;
  isAvailable: boolean;
  imageUrl?: string;
  isBestSeller: boolean;
  isChefSpecial: boolean;
  isRecommended: boolean;
  preparationTime?: number;
  rating?: string;
  ratingCount: number;
  spiceLevels?: string[];
  extras?: { name: string; price: number }[];
  comboWith?: { itemCode?: string; name: string; price: number }[];
};

type Booking = {
  id: string;
  room: { roomNumber: string };
  guestRecords: { fullName: string }[];
};

export default function PosPage() {
  const [activeTab, setActiveTab] = useState<'TERMINAL' | 'MENU'>('TERMINAL');

  // Fetch menu items (Terminal gets available only, Menu Setup gets all)
  const { data: menuData, error: menuError, mutate: mutateMenu } = useSWR('/pos/menu', fetcher);
  const { data: allMenuData, mutate: mutateAllMenu } = useSWR('/pos/menu?includeUnavailable=true', fetcher);
  const { data: bookingsData } = useSWR('/bookings', fetcher);

  const menuItems: MenuItem[] = menuData || [];
  const allMenuItems: MenuItem[] = allMenuData || [];
  const activeBookings: Booking[] = bookingsData?.filter((b: any) => b.status === 'CHECKED_IN') || [];
  const isLoading = !menuData && !menuError;

  // Menu Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Terminal State
  const [orderItems, setOrderItems] = useState<OrderItemSelection[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Customization Modal State
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);

  // Dialogs
  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, title?: string, message: string, type: 'error'|'success'|'info'}>({ isOpen: false, message: '', type: 'info' });
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, message: string, action?: string, id?: string}>({ isOpen: false, title: '', message: '' });

  // --- Menu Form Handlers ---

  const handleOpenForm = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
    } else {
      setEditingItem(null);
    }
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: MenuItemFormData) => {
    if (editingItem) {
      const promise = apiFetch(`/pos/menu/${editingItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });

      mutateAllMenu(async (currentData: any) => {
        await promise;
        if (!currentData) return currentData;
        return currentData.map((item: MenuItem) =>
          item.id === editingItem.id ? { ...item, ...data } : item
        );
      }, {
        optimisticData: (currentData: any) => {
          if (!currentData) return currentData;
          return currentData.map((item: MenuItem) =>
            item.id === editingItem.id ? { ...item, ...data } : item
          );
        },
        rollbackOnError: true,
        revalidate: true,
      });

      mutateMenu(async (currentData: any) => {
        if (!currentData) return currentData;
        const mapped = currentData.map((item: MenuItem) =>
          item.id === editingItem.id ? { ...item, ...data } : item
        );
        return mapped.filter((i: MenuItem) => i.isAvailable);
      }, {
        optimisticData: (currentData: any) => {
          if (!currentData) return currentData;
          const mapped = currentData.map((item: MenuItem) =>
            item.id === editingItem.id ? { ...item, ...data } : item
          );
          return mapped.filter((i: MenuItem) => i.isAvailable);
        },
        rollbackOnError: true,
        revalidate: false,
      });

      await mutateMenu();
    } else {
      const promise = apiFetch('/pos/menu', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      mutateAllMenu(async (currentData: any) => {
        await promise;
        if (!currentData) return currentData;
        return [{ id: `temp-${Date.now()}`, ...data, ratingCount: 0 }, ...currentData];
      }, {
        optimisticData: (currentData: any) => {
          if (!currentData) return currentData;
          return [{ id: `temp-${Date.now()}`, ...data, ratingCount: 0 }, ...currentData];
        },
        rollbackOnError: true,
        revalidate: true,
      });

      mutateMenu(async (currentData: any) => {
        if (!currentData) return currentData;
        if (!data.isAvailable) return currentData;
        return [{ id: `temp-${Date.now()}`, ...data, ratingCount: 0 }, ...currentData];
      }, {
        optimisticData: (currentData: any) => {
          if (!currentData) return currentData;
          if (!data.isAvailable) return currentData;
          return [{ id: `temp-${Date.now()}`, ...data, ratingCount: 0 }, ...currentData];
        },
        rollbackOnError: true,
        revalidate: false,
      });

      await mutateMenu();
    }

    setIsFormOpen(false);
    setEditingItem(null);
  };

  const handleDeleteMenuItem = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Menu Item',
      message: 'Are you sure you want to delete this menu item? If it has been used in orders, it will be marked as unavailable instead.',
      id: id,
      action: 'delete_menu_item'
    });
  };

  const confirmAction = async () => {
    setConfirmConfig({ ...confirmConfig, isOpen: false });
    if (confirmConfig.action === 'delete_menu_item' && confirmConfig.id) {
      try {
        const promise = apiFetch(`/pos/menu/${confirmConfig.id}`, { method: 'DELETE' });

        mutateAllMenu(async (currentData: any) => {
          await promise;
          if (!currentData) return currentData;
          return currentData.filter((item: MenuItem) => item.id !== confirmConfig.id);
        }, {
          optimisticData: (currentData: any) => {
            if (!currentData) return currentData;
            return currentData.filter((item: MenuItem) => item.id !== confirmConfig.id);
          },
          rollbackOnError: true,
          revalidate: true,
        });

        mutateMenu(async (currentData: any) => {
          if (!currentData) return currentData;
          return currentData.filter((item: MenuItem) => item.id !== confirmConfig.id);
        }, {
          optimisticData: (currentData: any) => {
            if (!currentData) return currentData;
            return currentData.filter((item: MenuItem) => item.id !== confirmConfig.id);
          },
          rollbackOnError: true,
          revalidate: false,
        });

        await mutateMenu();
      } catch (err: any) {
        setAlertConfig({ isOpen: true, title: 'Error', message: err.message || 'Failed to delete menu item', type: 'error' });
      }
    }
  };

  // --- Terminal Handlers ---

  const handleItemClick = (item: MenuItem) => {
    // If item has customization options, show the modal
    const hasCustomizations = (item.sizes && item.sizes.length > 0) ||
      (item.spiceLevels && item.spiceLevels.length > 0) ||
      (item.extras && item.extras.length > 0) ||
      (item.comboWith && item.comboWith.length > 0);

    if (item.id.startsWith('temp-')) {
      setAlertConfig({ isOpen: true, title: 'Item Saving', message: 'This item is still being saved to the database. Please wait a second and try again.', type: 'info' });
      return;
    }

    if (hasCustomizations) {
      setCustomizingItem(item);
      setIsCustomizationOpen(true);
    } else {
      // Quick add with defaults
      addToOrder({
        menuItem: item,
        quantity: 1,
        extras: [],
        comboItems: [],
        notes: '',
      });
    }
  };

  const addToOrder = (selection: OrderItemSelection) => {
    setOrderItems(prev => [...prev, selection]);
  };

  const updateQuantity = (index: number, delta: number) => {
    setOrderItems(prev =>
      prev
        .map((item, i) => i === index ? { ...item, quantity: item.quantity + delta } : item)
        .filter(item => item.quantity > 0)
    );
  };

  const removeFromOrder = (index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitOrder = async () => {
    if (orderItems.length === 0) return;
    setIsSubmittingOrder(true);
    try {
      const order = await apiFetch('/pos/orders', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: selectedBookingId || null,
          items: orderItems.map(item => ({
            menuItemId: item.menuItem.id,
            quantity: item.quantity,
            selectedSize: item.selectedSize || null,
            spiceLevel: item.spiceLevel || null,
            extras: item.extras.length > 0 ? item.extras : null,
            comboItems: item.comboItems.length > 0 ? item.comboItems : null,
            notes: item.notes || null,
          }))
        }),
      });

      // Automatically settle the order (Cash or Room Post) based on selection
      await apiFetch(`/pos/orders/${order.id}/settle`, {
        method: 'POST',
        body: JSON.stringify({
          method: selectedBookingId ? 'ROOM_POST' : 'CASH',
          bookingId: selectedBookingId || undefined
        })
      });

      setAlertConfig({ isOpen: true, title: 'Success', message: selectedBookingId ? 'KOT Generated & Posted to Room!' : 'KOT Generated & Settled as Cash!', type: 'success' });
      setOrderItems([]);
      setSelectedBookingId('');
    } catch (err: any) {
      setAlertConfig({ isOpen: true, title: 'Error', message: err.message || 'Failed to process order', type: 'error' });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // --- Derived Data ---
  const categories = ['All', ...Array.from(new Set(menuItems.map(m => m.category)))];
  const filteredMenu = activeCategory === 'All' ? menuItems : menuItems.filter(m => m.category === activeCategory);

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Restaurant POS</h3>
          <p className="text-slate-500 text-sm mt-1">Manage orders and room service.</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'MENU' && (
            <Button onClick={() => handleOpenForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Menu Item
            </Button>
          )}
          <div className="flex bg-slate-200/50 p-1 rounded-lg">
            <Button
              variant={activeTab === 'TERMINAL' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('TERMINAL')}
            >
              Terminal
            </Button>
            <Button
              variant={activeTab === 'MENU' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('MENU')}
            >
              Menu Setup
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <CardGridSkeleton count={8} />
      ) : activeTab === 'MENU' ? (
        /* ======================== MENU SETUP TAB ======================== */
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="flex-1 border-none shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <UtensilsCrossed className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{allMenuItems.length}</p>
                  <p className="text-xs text-slate-500">Total Items</p>
                </div>
              </CardContent>
            </Card>
            <Card className="flex-1 border-none shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <span className="text-emerald-600 font-bold text-sm">{allMenuItems.filter(i => i.isAvailable).length}</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{allMenuItems.filter(i => i.isAvailable).length}</p>
                  <p className="text-xs text-slate-500">Available</p>
                </div>
              </CardContent>
            </Card>
            <Card className="flex-1 border-none shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                  <span className="text-amber-600 font-bold text-sm">{Array.from(new Set(allMenuItems.map(i => i.category))).length}</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{Array.from(new Set(allMenuItems.map(i => i.category))).length}</p>
                  <p className="text-xs text-slate-500">Categories</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Menu Items Grid */}
          <Card className="border-none shadow-md">
            <CardHeader className="border-b border-slate-100 pb-4">
              <h4 className="text-lg font-semibold text-slate-900">Menu Items</h4>
            </CardHeader>
            <CardContent className="pt-6">
              {allMenuItems.length === 0 ? (
                <div className="text-center text-slate-500 py-12">
                  <UtensilsCrossed className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-base font-medium">No menu items yet</p>
                  <p className="text-sm mt-1">Click &quot;Add Menu Item&quot; to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {allMenuItems.map(item => (
                    <div
                      key={item.id}
                      className={`flex justify-between items-start p-4 border rounded-xl group hover:border-blue-200 hover:shadow-sm transition-all ${
                        !item.isAvailable ? 'bg-slate-50 opacity-60' : 'bg-white border-slate-100'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0" />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0">
                            <UtensilsCrossed className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 truncate">{item.name}</span>
                            {item.itemCode && (
                              <Badge variant="outline" className="text-[10px] text-slate-400 px-1.5 py-0 shrink-0">
                                {item.itemCode}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {item.category}
                            {item.subcategory && <span> · {item.subcategory}</span>}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {item.sizePricing && Object.keys(item.sizePricing).length > 0 ? (
                              <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700">
                                ₹{Math.min(...Object.values(item.sizePricing))} - ₹{Math.max(...Object.values(item.sizePricing))}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700">
                                ₹{Number(item.price)}
                              </Badge>
                            )}
                            {!item.isAvailable && (
                              <Badge variant="destructive" className="text-xs">Unavailable</Badge>
                            )}
                            {item.isBestSeller && (
                              <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">🔥 Best</span>
                            )}
                            {item.isChefSpecial && (
                              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">👨‍🍳 Chef</span>
                            )}
                            {item.isRecommended && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">⭐ Rec</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenForm(item)} title="Edit">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteMenuItem(item.id)} title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ======================== TERMINAL TAB ======================== */
        <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 overflow-hidden min-h-0 md:min-h-[500px]">
          {/* Left: Menu Grid */}
          <Card className="flex-1 flex flex-col border-none shadow-md overflow-hidden bg-white">
            <div className="flex overflow-x-auto p-4 border-b border-slate-100 gap-2 shrink-0">
              {categories.map(c => (
                <Button
                  key={c}
                  variant={activeCategory === c ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveCategory(c)}
                  className="rounded-full"
                >
                  {c}
                </Button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredMenu.map(item => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    onClick={handleItemClick}
                  />
                ))}
              </div>
              {filteredMenu.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <UtensilsCrossed className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm">No items in this category</p>
                </div>
              )}
            </div>
          </Card>

          {/* Right: Current Order */}
          <CurrentOrderPanel
            orderItems={orderItems}
            activeBookings={activeBookings}
            selectedBookingId={selectedBookingId}
            onBookingChange={setSelectedBookingId}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeFromOrder}
            onSubmitOrder={handleSubmitOrder}
            isSubmitting={isSubmittingOrder}
          />
        </div>
      )}

      {/* Menu Item Form Modal */}
      <MenuItemForm
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingItem(null); }}
        onSubmit={handleFormSubmit}
        editingItem={editingItem}
        existingItems={allMenuItems}
      />

      {/* Order Customization Modal */}
      <OrderCustomizationModal
        isOpen={isCustomizationOpen}
        item={customizingItem}
        onClose={() => { setIsCustomizationOpen(false); setCustomizingItem(null); }}
        onAdd={addToOrder}
      />

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
        onConfirm={confirmAction}
        onCancel={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
      />
    </div>
  );
}
