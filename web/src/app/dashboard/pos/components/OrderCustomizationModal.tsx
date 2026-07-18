'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Minus } from 'lucide-react';

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

export type OrderItemSelection = {
  menuItem: MenuItem;
  quantity: number;
  selectedSize?: string;
  spiceLevel?: string;
  extras: { name: string; price: number }[];
  comboItems: { name: string; price: number }[];
  notes: string;
};

interface OrderCustomizationModalProps {
  isOpen: boolean;
  item: MenuItem | null;
  onClose: () => void;
  onAdd: (selection: OrderItemSelection) => void;
}

const SPICE_EMOJIS: Record<string, string> = {
  'Mild': '🌶️',
  'Medium': '🌶️🌶️',
  'Hot': '🌶️🌶️🌶️',
  'Extra Hot': '🔥',
};

export default function OrderCustomizationModal({
  isOpen,
  item,
  onClose,
  onAdd,
}: OrderCustomizationModalProps) {
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);
  const [spiceLevel, setSpiceLevel] = useState<string | undefined>(undefined);
  const [selectedExtras, setSelectedExtras] = useState<{ name: string; price: number }[]>([]);
  const [selectedCombos, setSelectedCombos] = useState<{ name: string; price: number }[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  // Reset all selections when the item changes (modal opens for a new item)
  useEffect(() => {
    if (item) {
      setSelectedSize(item.sizes && item.sizes.length > 0 ? item.sizes[0] : undefined);
      setSpiceLevel(item.spiceLevels && item.spiceLevels.length > 0 ? item.spiceLevels[0] : undefined);
      setSelectedExtras([]);
      setSelectedCombos([]);
      setQuantity(1);
      setNotes('');
    }
  }, [item?.id]);

  if (!isOpen || !item) return null;

  const toggleExtra = (extra: { name: string; price: number }) => {
    setSelectedExtras((prev) => {
      const exists = prev.find((e) => e.name === extra.name);
      if (exists) return prev.filter((e) => e.name !== extra.name);
      return [...prev, extra];
    });
  };

  const toggleCombo = (combo: { name: string; price: number }) => {
    setSelectedCombos((prev) => {
      const exists = prev.find((c) => c.name === combo.name);
      if (exists) return prev.filter((c) => c.name !== combo.name);
      return [...prev, combo];
    });
  };

  // Calculate base price from size or item price
  const basePrice =
    selectedSize && item.sizePricing && item.sizePricing[selectedSize] != null
      ? item.sizePricing[selectedSize]
      : Number(item.price);

  const extrasTotal = selectedExtras.reduce((sum, e) => sum + e.price, 0);
  const combosTotal = selectedCombos.reduce((sum, c) => sum + c.price, 0);
  const totalPrice = (basePrice + extrasTotal + combosTotal) * quantity;

  const handleAdd = () => {
    onAdd({
      menuItem: item,
      quantity,
      selectedSize,
      spiceLevel,
      extras: selectedExtras,
      comboItems: selectedCombos,
      notes,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-w-lg w-full bg-white rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200 animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-4 p-5 pb-4 border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0 text-slate-400 text-xs font-medium">
              IMG
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-900 truncate">{item.name}</h3>
            <p className="text-sm text-slate-500">
              {item.category}
              {item.subcategory ? ` · ${item.subcategory}` : ''}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {item.isBestSeller && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
                  ⭐ Best Seller
                </Badge>
              )}
              {item.isChefSpecial && (
                <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100">
                  👨‍🍳 Chef&apos;s Special
                </Badge>
              )}
              {item.isRecommended && (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                  👍 Recommended
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-slate-400 hover:text-slate-600 -mt-1 -mr-1"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* 1. Size Selection */}
          {item.sizes && item.sizes.length > 0 && (
            <div>
              <label className="block font-semibold text-slate-800 mb-2">Select Size</label>
              <div className="flex flex-wrap gap-2">
                {item.sizes.map((size) => {
                  const isSelected = selectedSize === size;
                  const sizePrice =
                    item.sizePricing && item.sizePricing[size] != null
                      ? item.sizePricing[size]
                      : Number(item.price);
                  return (
                    <div
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-3 rounded-xl border-2 cursor-pointer transition-all text-center ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-medium text-slate-800">{size}</div>
                      <div className="text-sm text-blue-600 font-semibold">₹{sizePrice}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Spice Level */}
          {item.spiceLevels && item.spiceLevels.length > 0 && (
            <div>
              <label className="block font-semibold text-slate-800 mb-2">Spice Level 🌶️</label>
              <div className="flex flex-wrap gap-2">
                {item.spiceLevels.map((level) => {
                  const isSelected = spiceLevel === level;
                  const emoji = SPICE_EMOJIS[level] || '🌶️';
                  return (
                    <div
                      key={level}
                      onClick={() => setSpiceLevel(level)}
                      className={`px-4 py-2 rounded-full border cursor-pointer transition-all text-sm font-medium ${
                        isSelected
                          ? 'bg-red-500 text-white border-red-500'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-red-300'
                      }`}
                    >
                      {emoji} {level}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Extras */}
          {item.extras && item.extras.length > 0 && (
            <div>
              <label className="block font-semibold text-slate-800 mb-2">Add Extras</label>
              <div className="space-y-2">
                {item.extras.map((extra) => {
                  const isSelected = selectedExtras.some((e) => e.name === extra.name);
                  return (
                    <div
                      key={extra.name}
                      onClick={() => toggleExtra(extra)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-300'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-300'
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="flex-1 text-sm font-medium text-slate-700">{extra.name}</span>
                      <span className="text-sm font-semibold text-emerald-600">+₹{extra.price}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Combo Suggestions */}
          {item.comboWith && item.comboWith.length > 0 && (
            <div>
              <label className="block font-semibold text-slate-800 mb-2">Goes well with 🍽️</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {item.comboWith.map((combo) => {
                  const isSelected = selectedCombos.some((c) => c.name === combo.name);
                  return (
                    <div
                      key={combo.name}
                      onClick={() => toggleCombo({ name: combo.name, price: combo.price })}
                      className={`border rounded-xl p-3 text-center min-w-[100px] cursor-pointer transition-all shrink-0 ${
                        isSelected
                          ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-200'
                          : 'border-slate-200 hover:border-amber-200'
                      }`}
                    >
                      <div className="text-sm font-medium text-slate-800">{combo.name}</div>
                      <div className="text-xs font-semibold text-amber-600 mt-1">+₹{combo.price}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. Quantity */}
          <div>
            <label className="block font-semibold text-slate-800 mb-2">Quantity</label>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="text-xl font-bold text-slate-900 w-8 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl"
                onClick={() => setQuantity((q) => q + 1)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* 6. Special Notes */}
          <div>
            <label className="block font-semibold text-slate-800 mb-2">Special Instructions</label>
            <textarea
              className="flex w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              rows={2}
              placeholder="Any special instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4 bg-slate-50 rounded-b-2xl flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500 font-medium">Total</div>
            <div className="text-xl font-bold text-slate-900">₹{totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <Button size="lg" className="px-8 text-base font-semibold" onClick={handleAdd}>
            <Plus className="w-5 h-5 mr-2" />
            Add to Order
          </Button>
        </div>
      </div>
    </div>
  );
}
