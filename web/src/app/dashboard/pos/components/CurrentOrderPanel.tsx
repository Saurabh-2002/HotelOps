'use client';

import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader } from '@/components/ui/card';
import { ReceiptText, UtensilsCrossed, X, Loader2, Save } from 'lucide-react';
import type { OrderItemSelection } from './OrderCustomizationModal';

type Booking = {
  id: string;
  room: { roomNumber: string };
  guestRecords: { fullName: string }[];
};

interface CurrentOrderPanelProps {
  orderItems: OrderItemSelection[];
  activeBookings: Booking[];
  selectedBookingId: string;
  onBookingChange: (bookingId: string) => void;
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onSubmitOrder: () => Promise<void>;
  isSubmitting: boolean;
}

function calculateItemPrice(item: OrderItemSelection): number {
  let base: number;
  if (item.selectedSize && item.menuItem.sizePricing) {
    base =
      item.menuItem.sizePricing[item.selectedSize.toLowerCase()] ||
      Number(item.menuItem.price);
  } else {
    base = Number(item.menuItem.price);
  }
  const extrasTotal = item.extras.reduce((sum, e) => sum + e.price, 0);
  const comboTotal = item.comboItems.reduce((sum, c) => sum + c.price, 0);
  return base + extrasTotal + comboTotal;
}

export default function CurrentOrderPanel({
  orderItems,
  activeBookings,
  selectedBookingId,
  onBookingChange,
  onUpdateQuantity,
  onRemoveItem,
  onSubmitOrder,
  isSubmitting,
}: CurrentOrderPanelProps) {
  const totalItemCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const orderTotal = orderItems.reduce(
    (sum, item) => sum + calculateItemPrice(item) * item.quantity,
    0
  );

  return (
    <Card className="w-full md:w-96 flex flex-col border-none shadow-md shrink-0 bg-white overflow-hidden">
      {/* Header */}
      <CardHeader className="p-4 border-b border-slate-100 bg-slate-50 pb-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-800 flex items-center">
            <ReceiptText className="w-5 h-5 mr-2 text-slate-500" />
            Current Order
          </h4>
          {totalItemCount > 0 && (
            <Badge variant="default" className="text-xs">
              {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
            </Badge>
          )}
        </div>
      </CardHeader>

      {/* Room Assignment */}
      <div className="p-4 border-b border-slate-100">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Assign To Room
        </label>
        <Select
          value={selectedBookingId}
          onChange={(e) => onBookingChange(e.target.value)}
        >
          <option value="">Walk-in (Cash Order)</option>
          {activeBookings.map((b) => (
            <option key={b.id} value={b.id}>
              Room {b.room.roomNumber} - {b.guestRecords[0]?.fullName}
            </option>
          ))}
        </Select>
      </div>

      {/* Order Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
        {orderItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <UtensilsCrossed className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">Select items from the menu</p>
          </div>
        ) : (
          orderItems.map((item, index) => {
            const unitPrice = calculateItemPrice(item);
            const lineTotal = unitPrice * item.quantity;

            return (
              <div
                key={`${item.menuItem.id}-${index}`}
                className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm"
              >
                {/* Row 1: Name + Size */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-slate-800 truncate">
                    {item.menuItem.name}
                  </span>
                  {item.selectedSize && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-blue-50 text-blue-700 shrink-0"
                    >
                      {item.selectedSize}
                    </Badge>
                  )}
                </div>

                {/* Row 2: Customization details */}
                {(item.spiceLevel ||
                  item.extras.length > 0 ||
                  item.comboItems.length > 0) && (
                  <div className="text-xs text-slate-500 mb-2 space-y-0.5">
                    {item.spiceLevel && <div>🌶️ {item.spiceLevel}</div>}
                    {item.extras.length > 0 && (
                      <div>+ {item.extras.map((e) => e.name).join(', ')}</div>
                    )}
                    {item.comboItems.length > 0 && (
                      <div>
                        🍽️ + {item.comboItems.map((c) => c.name).join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Row 3: Quantity controls + price */}
                <div className="flex items-center gap-2">
                  {/* Quantity controls */}
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-md bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      onClick={() => onUpdateQuantity(index, -1)}
                    >
                      −
                    </Button>
                    <div className="w-5 text-center text-sm font-semibold">
                      {item.quantity}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-md bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      onClick={() => onUpdateQuantity(index, 1)}
                    >
                      +
                    </Button>
                  </div>

                  {/* Per-unit price */}
                  <span className="text-xs text-slate-500">₹{unitPrice} each</span>

                  {/* Line total + remove */}
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="font-bold text-slate-700 text-sm">
                      ₹{lineTotal}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                      onClick={() => onRemoveItem(index)}
                      title="Remove item"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50 mt-auto">
        <div className="flex justify-between items-center mb-1">
          <span className="text-slate-600 font-medium">Subtotal</span>
          <span className="text-xl font-bold text-slate-900">
            ₹{orderTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} in order
        </p>
        <Button
          size="lg"
          className="w-full text-base font-semibold"
          onClick={onSubmitOrder}
          disabled={orderItems.length === 0 || isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Save className="w-5 h-5 mr-2" />
          )}
          {selectedBookingId ? 'Post to Room & Print KOT' : 'Pay Cash & Print KOT'}
        </Button>
      </div>
    </Card>
  );
}
