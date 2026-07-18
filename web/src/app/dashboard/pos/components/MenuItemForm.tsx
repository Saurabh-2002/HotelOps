'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Link,
  Save,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

export type MenuItemFormData = {
  itemCode?: string;
  name: string;
  category: string;
  subcategory?: string;
  price: number;
  sizes?: string[];
  sizePricing?: Record<string, number>;
  isAvailable: boolean;
  imageUrl?: string;
  isBestSeller: boolean;
  isChefSpecial: boolean;
  isRecommended: boolean;
  preparationTime?: number;
  rating?: number;
  ratingCount?: number;
  spiceLevels?: string[];
  extras?: { name: string; price: number }[];
  comboWith?: { itemCode?: string; name: string; price: number }[];
};

interface MenuItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MenuItemFormData) => Promise<void>;
  editingItem?: MenuItem | null;
  existingItems: MenuItem[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_PRESETS = [
  'North Indian',
  'South Indian',
  'Chinese',
  'Beverages',
  'Desserts',
  'Starters',
  'Biryani',
  'Breads',
];

const SPICE_PRESETS = ['Mild', 'Medium', 'Hot', 'Extra Hot'];

const DEFAULT_SIZE_ROWS: { name: string; price: number }[] = [
  { name: 'Quarter', price: 0 },
  { name: 'Half', price: 0 },
  { name: 'Full', price: 0 },
];

// ---------------------------------------------------------------------------
// Toggle Switch sub-component
// ---------------------------------------------------------------------------

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          checked ? 'bg-blue-600' : 'bg-slate-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      {label && <span className="text-sm text-slate-700">{label}</span>}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Collapsible Section sub-component
// ---------------------------------------------------------------------------

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <span className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
          {title}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function MenuItemForm({
  isOpen,
  onClose,
  onSubmit,
  editingItem,
  existingItems,
}: MenuItemFormProps) {
  // --- Form state ---
  const [itemCode, setItemCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');

  // Image
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pricing
  const [pricingMode, setPricingMode] = useState<'single' | 'size'>('single');
  const [singlePrice, setSinglePrice] = useState('');
  const [sizeRows, setSizeRows] = useState<{ name: string; price: number }[]>(
    () => [...DEFAULT_SIZE_ROWS]
  );

  // Badges & Info
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [isChefSpecial, setIsChefSpecial] = useState(false);
  const [isRecommended, setIsRecommended] = useState(false);
  const [preparationTime, setPreparationTime] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  // Ratings
  const [rating, setRating] = useState('');
  const [ratingCount, setRatingCount] = useState('');

  // Customizations – Spice
  const [selectedSpiceLevels, setSelectedSpiceLevels] = useState<string[]>([]);
  const [customSpice, setCustomSpice] = useState('');

  // Customizations – Extras
  const [extras, setExtras] = useState<{ name: string; price: number }[]>([]);

  // Customizations – Combos
  const [combos, setCombos] = useState<
    { itemCode?: string; name: string; price: number }[]
  >([]);
  const [comboSearch, setComboSearch] = useState('');

  // Loading
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---------------------------------------------------------------------------
  // Populate form when editingItem changes
  // ---------------------------------------------------------------------------

  const populateForm = useCallback((item: MenuItem | null | undefined) => {
    if (!item) {
      // Reset to defaults
      setItemCode('');
      setName('');
      setCategory('');
      setSubcategory('');
      setImageMode('url');
      setImageUrl('');
      setImagePreview('');
      setPricingMode('single');
      setSinglePrice('');
      setSizeRows([...DEFAULT_SIZE_ROWS]);
      setIsBestSeller(false);
      setIsChefSpecial(false);
      setIsRecommended(false);
      setPreparationTime('');
      setIsAvailable(true);
      setRating('');
      setRatingCount('');
      setSelectedSpiceLevels([]);
      setCustomSpice('');
      setExtras([]);
      setCombos([]);
      setComboSearch('');
      return;
    }

    setItemCode(item.itemCode ?? '');
    setName(item.name);
    setCategory(item.category);
    setSubcategory(item.subcategory ?? '');
    setImageUrl(item.imageUrl ?? '');
    setImagePreview(item.imageUrl ?? '');
    setImageMode(item.imageUrl ? 'url' : 'url');
    setIsBestSeller(item.isBestSeller);
    setIsChefSpecial(item.isChefSpecial);
    setIsRecommended(item.isRecommended);
    setPreparationTime(item.preparationTime != null ? String(item.preparationTime) : '');
    setIsAvailable(item.isAvailable);
    setRating(item.rating ?? '');
    setRatingCount(String(item.ratingCount ?? ''));
    setSelectedSpiceLevels(item.spiceLevels ?? []);
    setExtras(item.extras ?? []);
    setCombos(item.comboWith ?? []);

    // Pricing
    if (item.sizes && item.sizes.length > 0 && item.sizePricing) {
      setPricingMode('size');
      setSizeRows(
        item.sizes.map((s) => ({ name: s, price: item.sizePricing![s] ?? 0 }))
      );
      setSinglePrice('');
    } else {
      setPricingMode('single');
      setSinglePrice(String(item.price));
      setSizeRows([...DEFAULT_SIZE_ROWS]);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      populateForm(editingItem);
    }
  }, [isOpen, editingItem, populateForm]);

  // ---------------------------------------------------------------------------
  // Image handling (same pattern as existing POS page)
  // ---------------------------------------------------------------------------

  const handleFileUpload = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await handleFileUpload(file);
      setImagePreview(dataUrl);
      setImageUrl(dataUrl);
    } catch {
      // silently fail – parent can handle errors
    }
  };

  const clearImage = () => {
    setImagePreview('');
    setImageUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ---------------------------------------------------------------------------
  // Pricing helpers
  // ---------------------------------------------------------------------------

  const handlePricingModeToggle = (mode: 'single' | 'size') => {
    if (mode === pricingMode) return;
    if (mode === 'single' && sizeRows.length > 0) {
      // Use first size price as the single price
      const firstPrice = sizeRows[0]?.price;
      if (firstPrice) setSinglePrice(String(firstPrice));
    }
    setPricingMode(mode);
  };

  const updateSizeRow = (
    idx: number,
    field: 'name' | 'price',
    value: string
  ) => {
    setSizeRows((prev) =>
      prev.map((row, i) =>
        i === idx
          ? { ...row, [field]: field === 'price' ? Number(value) || 0 : value }
          : row
      )
    );
  };

  const removeSizeRow = (idx: number) => {
    setSizeRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const addSizeRow = () => {
    setSizeRows((prev) => [...prev, { name: '', price: 0 }]);
  };

  // ---------------------------------------------------------------------------
  // Spice level helpers
  // ---------------------------------------------------------------------------

  const toggleSpiceLevel = (level: string) => {
    setSelectedSpiceLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const addCustomSpice = () => {
    const trimmed = customSpice.trim();
    if (!trimmed || selectedSpiceLevels.includes(trimmed)) return;
    setSelectedSpiceLevels((prev) => [...prev, trimmed]);
    setCustomSpice('');
  };

  // ---------------------------------------------------------------------------
  // Extras helpers
  // ---------------------------------------------------------------------------

  const addExtra = () => {
    setExtras((prev) => [...prev, { name: '', price: 0 }]);
  };

  const updateExtra = (
    idx: number,
    field: 'name' | 'price',
    value: string
  ) => {
    setExtras((prev) =>
      prev.map((row, i) =>
        i === idx
          ? { ...row, [field]: field === 'price' ? Number(value) || 0 : value }
          : row
      )
    );
  };

  const removeExtra = (idx: number) => {
    setExtras((prev) => prev.filter((_, i) => i !== idx));
  };

  // ---------------------------------------------------------------------------
  // Combo helpers
  // ---------------------------------------------------------------------------

  const filteredComboItems = existingItems.filter(
    (item) =>
      !combos.some((c) => c.name === item.name) &&
      item.name.toLowerCase().includes(comboSearch.toLowerCase())
  );

  const addCombo = (item: MenuItem) => {
    setCombos((prev) => [
      ...prev,
      { itemCode: item.itemCode, name: item.name, price: Number(item.price) },
    ]);
    setComboSearch('');
  };

  const removeCombo = (idx: number) => {
    setCombos((prev) => prev.filter((_, i) => i !== idx));
  };

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData: MenuItemFormData = {
        name,
        category,
        isAvailable,
        isBestSeller,
        isChefSpecial,
        isRecommended,
        ratingCount: ratingCount ? Number(ratingCount) : undefined,
        price: 0,
      };

      if (itemCode.trim()) formData.itemCode = itemCode.trim();
      if (subcategory.trim()) formData.subcategory = subcategory.trim();
      if (imageUrl.trim()) formData.imageUrl = imageUrl.trim();
      if (preparationTime) formData.preparationTime = Number(preparationTime);
      if (rating) formData.rating = Number(rating);

      // Pricing
      if (pricingMode === 'single') {
        formData.price = Number(singlePrice) || 0;
      } else {
        const validRows = sizeRows.filter((r) => r.name.trim());
        formData.sizes = validRows.map((r) => r.name.trim());
        formData.sizePricing = {};
        for (const row of validRows) {
          formData.sizePricing[row.name.trim()] = row.price;
        }
        formData.price = validRows[0]?.price ?? 0;
      }

      // Spice levels
      if (selectedSpiceLevels.length > 0)
        formData.spiceLevels = selectedSpiceLevels;

      // Extras
      const validExtras = extras.filter((x) => x.name.trim());
      if (validExtras.length > 0) formData.extras = validExtras;

      // Combos
      if (combos.length > 0) formData.comboWith = combos;

      await onSubmit(formData);
      onClose();
    } catch {
      // Parent handles errors
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="animate-in fade-in zoom-in-95 duration-200 w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-lg font-semibold text-slate-900">
            {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* ── Scrollable Body ── */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
        >
          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* Section 1: Basic Info */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <Section title="Basic Info" defaultOpen>
            {/* Item Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Item Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Paneer Tikka"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                required
                list="category-presets"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Starters"
              />
              <datalist id="category-presets">
                {CATEGORY_PRESETS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            {/* Subcategory */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Subcategory{' '}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <Input
                type="text"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                placeholder="e.g., Chicken, Paneer"
              />
            </div>

            {/* Image */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Item Image{' '}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <div className="flex items-center gap-2 mb-2">
                <Button
                  type="button"
                  size="sm"
                  variant={imageMode === 'url' ? 'default' : 'outline'}
                  onClick={() => setImageMode('url')}
                >
                  <Link className="w-3.5 h-3.5 mr-1.5" /> URL
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={imageMode === 'upload' ? 'default' : 'outline'}
                  onClick={() => {
                    setImageMode('upload');
                    fileInputRef.current?.click();
                  }}
                >
                  <ImagePlus className="w-3.5 h-3.5 mr-1.5" /> Upload
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageFileChange}
                />
                {imagePreview && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700 ml-auto"
                    onClick={clearImage}
                  >
                    <X className="w-3.5 h-3.5 mr-1" /> Remove
                  </Button>
                )}
              </div>
              {imageMode === 'url' && (
                <Input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setImagePreview(e.target.value);
                  }}
                  placeholder="https://example.com/image.jpg"
                />
              )}
              {imagePreview && (
                <div className="mt-2 relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </Section>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* Section 2: Pricing */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <Section title="Pricing" defaultOpen>
            {/* Toggle */}
            <div className="flex items-center gap-4">
              <Button
                type="button"
                size="sm"
                variant={pricingMode === 'single' ? 'default' : 'outline'}
                onClick={() => handlePricingModeToggle('single')}
              >
                Single Price
              </Button>
              <Button
                type="button"
                size="sm"
                variant={pricingMode === 'size' ? 'default' : 'outline'}
                onClick={() => handlePricingModeToggle('size')}
              >
                Size-based Pricing
              </Button>
            </div>

            {pricingMode === 'single' ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Price (₹) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={singlePrice}
                  onChange={(e) => setSinglePrice(e.target.value)}
                  placeholder="250"
                />
              </div>
            ) : (
              <div className="space-y-3">
                {sizeRows.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={row.name}
                      onChange={(e) =>
                        updateSizeRow(idx, 'name', e.target.value)
                      }
                      placeholder="Size name"
                      className="flex-1"
                    />
                    <div className="relative w-32">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                        ₹
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.price || ''}
                        onChange={(e) =>
                          updateSizeRow(idx, 'price', e.target.value)
                        }
                        placeholder="0"
                        className="pl-7"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                      onClick={() => removeSizeRow(idx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSizeRow}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Size
                </Button>
              </div>
            )}
          </Section>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* Section 3: Badges & Info */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <Section title="Badges & Info" defaultOpen={false}>
            {/* Badge toggles */}
            <div className="flex flex-wrap items-center gap-6">
              <ToggleSwitch
                checked={isBestSeller}
                onChange={setIsBestSeller}
                label="Best Seller"
              />
              <ToggleSwitch
                checked={isChefSpecial}
                onChange={setIsChefSpecial}
                label="Chef's Special"
              />
              <ToggleSwitch
                checked={isRecommended}
                onChange={setIsRecommended}
                label="Recommended"
              />
            </div>

            {/* Preparation Time */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Preparation Time (minutes)
              </label>
              <Input
                type="number"
                min="0"
                value={preparationTime}
                onChange={(e) => setPreparationTime(e.target.value)}
                placeholder="e.g., 20"
              />
            </div>

            {/* Availability */}
            <div className="flex items-center gap-3">
              <ToggleSwitch
                checked={isAvailable}
                onChange={setIsAvailable}
                label="Available"
              />
            </div>
          </Section>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* Section 4: Ratings */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <Section title="Ratings" defaultOpen={false}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Rating (0–5)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  placeholder="4.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Rating Count
                </label>
                <Input
                  type="number"
                  min="0"
                  value={ratingCount}
                  onChange={(e) => setRatingCount(e.target.value)}
                  placeholder="120"
                />
              </div>
            </div>
          </Section>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* Section 5: Customizations */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <Section title="Customizations" defaultOpen={false}>
            {/* ── Spice Levels ── */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Spice Levels
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {SPICE_PRESETS.map((level) => (
                  <Badge
                    key={level}
                    variant={
                      selectedSpiceLevels.includes(level)
                        ? 'default'
                        : 'outline'
                    }
                    className={`cursor-pointer select-none transition-colors ${
                      selectedSpiceLevels.includes(level)
                        ? ''
                        : 'hover:bg-slate-100'
                    }`}
                    onClick={() => toggleSpiceLevel(level)}
                  >
                    {level}
                  </Badge>
                ))}
                {/* Custom spice levels that aren't presets */}
                {selectedSpiceLevels
                  .filter((l) => !SPICE_PRESETS.includes(l))
                  .map((level) => (
                    <Badge
                      key={level}
                      variant="default"
                      className="cursor-pointer select-none"
                      onClick={() => toggleSpiceLevel(level)}
                    >
                      {level}
                      <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
              </div>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={customSpice}
                  onChange={(e) => setCustomSpice(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomSpice();
                    }
                  }}
                  placeholder="Add custom spice level"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomSpice}
                  disabled={!customSpice.trim()}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* ── Extras ── */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Extras
              </label>
              <div className="space-y-2 mb-3">
                {extras.map((extra, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={extra.name}
                      onChange={(e) =>
                        updateExtra(idx, 'name', e.target.value)
                      }
                      placeholder="Extra name"
                      className="flex-1"
                    />
                    <div className="relative w-28">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                        ₹
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={extra.price || ''}
                        onChange={(e) =>
                          updateExtra(idx, 'price', e.target.value)
                        }
                        placeholder="0"
                        className="pl-7"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                      onClick={() => removeExtra(idx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addExtra}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Extra
              </Button>
            </div>

            {/* ── Combo Suggestions ── */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Combo Suggestions
              </label>

              {/* Selected combos */}
              {combos.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {combos.map((combo, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="pl-2.5 pr-1.5 py-1 flex items-center gap-1.5"
                    >
                      {combo.name}
                      <span className="text-xs opacity-70">
                        ₹{combo.price}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCombo(idx)}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-slate-300/50 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Input
                  type="text"
                  value={comboSearch}
                  onChange={(e) => setComboSearch(e.target.value)}
                  placeholder="Search items to add as combo..."
                />
                {comboSearch.trim() && filteredComboItems.length > 0 && (
                  <Card className="absolute z-10 top-full mt-1 left-0 right-0 max-h-40 overflow-y-auto shadow-lg border border-slate-200">
                    <CardContent className="p-1">
                      {filteredComboItems.slice(0, 8).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => addCombo(item)}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 rounded-md transition-colors text-left"
                        >
                          <span className="text-slate-800">{item.name}</span>
                          <span className="text-slate-500 text-xs">
                            ₹{Number(item.price)}
                          </span>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </Section>
        </form>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !name.trim() || !category.trim()}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {editingItem ? 'Save Changes' : 'Add Item'}
          </Button>
        </div>
      </div>
    </div>
  );
}
