'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UtensilsCrossed, Star, Clock, Plus } from 'lucide-react';

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

interface MenuItemCardProps {
  item: MenuItem;
  onClick: (item: MenuItem) => void;
}

export default function MenuItemCard({ item, onClick }: MenuItemCardProps) {
  const hasBadges = item.isBestSeller || item.isChefSpecial || item.isRecommended;

  // Calculate price display
  const sizePrices = item.sizePricing ? Object.values(item.sizePricing) : [];
  const hasSizePricing = sizePrices.length > 0;
  const minPrice = hasSizePricing ? Math.min(...sizePrices) : Number(item.price);
  const maxPrice = hasSizePricing ? Math.max(...sizePrices) : Number(item.price);
  const priceLabel = hasSizePricing && minPrice !== maxPrice
    ? `₹${minPrice.toLocaleString('en-IN')} - ₹${maxPrice.toLocaleString('en-IN')}`
    : `₹${minPrice.toLocaleString('en-IN')}`;

  return (
    <Card
      className={`p-0 overflow-hidden cursor-pointer group transition-all duration-300
        hover:border-blue-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1
        flex flex-col h-full bg-white
        ${!item.isAvailable ? 'opacity-50 pointer-events-none grayscale-[50%]' : ''}`}
      onClick={() => onClick(item)}
    >
      {/* Image Area */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-50 shrink-0">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
            <UtensilsCrossed className="h-10 w-10 text-slate-300" />
          </div>
        )}

        {/* Subtle gradient overlay for better badge visibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent pointer-events-none" />

        {/* Badge Overlays */}
        {hasBadges && (
          <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 items-end">
            {item.isBestSeller && (
              <span className="bg-orange-500/95 backdrop-blur-sm shadow-sm text-white text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-md leading-none">
                Best Seller
              </span>
            )}
            {item.isChefSpecial && (
              <span className="bg-slate-900/95 backdrop-blur-sm shadow-sm text-white text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-md leading-none">
                Chef's Special
              </span>
            )}
            {item.isRecommended && (
              <span className="bg-emerald-500/95 backdrop-blur-sm shadow-sm text-white text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-md leading-none">
                Recommended
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-4 flex flex-col flex-1">
        {/* Category & Item Code */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest line-clamp-1">
            {item.category}
            {item.subcategory && <span className="text-slate-400"> • {item.subcategory}</span>}
          </p>
          {item.itemCode && (
            <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
              {item.itemCode}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-slate-800 text-base leading-tight line-clamp-2 mb-3 group-hover:text-blue-600 transition-colors">
          {item.name}
        </h3>

        <div className="mt-auto">
          {/* Price */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">{hasSizePricing ? 'From' : 'Price'}</p>
              <p className="font-bold text-lg text-slate-900 leading-none tracking-tight">
                {priceLabel}
              </p>
            </div>
            
            {/* Action button hint */}
            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
              <Plus className="h-4 w-4" />
            </div>
          </div>

          {/* Divider */}
          {(item.rating || item.preparationTime) && (
            <div className="h-px w-full bg-slate-100 my-3" />
          )}

          {/* Rating + Prep Time */}
          {(item.rating || item.preparationTime) && (
            <div className="flex items-center justify-between">
              {/* Rating */}
              {item.rating ? (
                <div className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-[12px] font-bold text-slate-700">{item.rating}</span>
                  <span className="text-[11px] font-medium text-slate-400">({item.ratingCount})</span>
                </div>
              ) : (
                <div />
              )}

              {/* Prep Time */}
              {item.preparationTime ? (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>{item.preparationTime} min</span>
                </div>
              ) : (
                <div />
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
