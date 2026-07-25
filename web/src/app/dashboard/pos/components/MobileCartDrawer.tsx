'use client';

import { useEffect, useRef, useState } from 'react';
import { X, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  itemCount: number;
  total: number;
}

export default function MobileCartDrawer({
  isOpen,
  onClose,
  children,
  itemCount,
  total,
}: MobileCartDrawerProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden';
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      document.body.style.overflow = '';
      return () => clearTimeout(timer);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle swipe-down to dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || !drawerRef.current) return;
    currentY.current = e.touches[0].clientY;
    const delta = currentY.current - startY.current;
    if (delta > 0) {
      drawerRef.current.style.transform = `translateY(${delta}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current || !drawerRef.current) return;
    isDragging.current = false;
    const delta = currentY.current - startY.current;
    if (delta > 100) {
      // Swipe down far enough to dismiss
      onClose();
    }
    drawerRef.current.style.transform = '';
  };

  if (!isVisible) return null;

  return (
    <div className="md:hidden fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isAnimating ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '85vh' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-slate-600" />
            <h3 className="font-bold text-slate-800 text-lg">Your Order</h3>
            {itemCount > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {itemCount}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-slate-500 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}
