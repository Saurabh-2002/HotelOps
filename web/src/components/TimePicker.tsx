'use client';

import { useState, useRef, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';

type TimePickerProps = {
  value: string; // "HH:mm" in 24-hour format
  onChange: (value: string) => void;
  label?: string;
};

function to12Hour(time24: string): { hour: number; minute: number; period: 'AM' | 'PM' } {
  const [h, m] = time24.split(':').map(Number);
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { hour, minute: m, period };
}

function to24Hour(hour: number, minute: number, period: 'AM' | 'PM'): string {
  let h = hour;
  if (period === 'AM' && h === 12) h = 0;
  if (period === 'PM' && h !== 12) h = h + 12;
  return `${h.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

export default function TimePicker({ value, onChange, label }: TimePickerProps) {
  const parsed = to12Hour(value || '12:00');
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [period, setPeriod] = useState<'AM' | 'PM'>(parsed.period);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal state when external value changes
  useEffect(() => {
    const p = to12Hour(value || '12:00');
    setHour(p.hour);
    setMinute(p.minute);
    setPeriod(p.period);
  }, [value]);

  // Emit change
  useEffect(() => {
    const newVal = to24Hour(hour, minute, period);
    if (newVal !== value) {
      onChange(newVal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hour, minute, period]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const incrementHour = () => setHour(h => (h >= 12 ? 1 : h + 1));
  const decrementHour = () => setHour(h => (h <= 1 ? 12 : h - 1));
  const incrementMinute = () => setMinute(m => (m >= 55 ? 0 : m + 5));
  const decrementMinute = () => setMinute(m => (m <= 0 ? 55 : m - 5));
  const togglePeriod = () => setPeriod(p => (p === 'AM' ? 'PM' : 'AM'));

  const displayTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${period}`;

  return (
    <div ref={containerRef} className="relative">
      {/* Display Input */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 text-sm shadow-sm cursor-pointer hover:border-blue-400 transition-colors focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
      >
        <Clock className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
        <span className="font-medium">{displayTime}</span>
      </div>

      {/* Dropdown Picker */}
      {isOpen && (
        <div className="absolute z-50 mt-2 left-0 bg-white border border-slate-200 rounded-xl shadow-xl p-4 animate-in fade-in slide-in-from-top-2 duration-150 w-[220px]">
          {/* Picker Columns */}
          <div className="flex items-center justify-center gap-3">
            {/* Hour */}
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={incrementHour}
                className="p-1 rounded-md hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <div className="w-12 h-10 flex items-center justify-center bg-blue-50 rounded-lg text-lg font-bold text-blue-700 border border-blue-200">
                {hour.toString().padStart(2, '0')}
              </div>
              <button
                type="button"
                onClick={decrementHour}
                className="p-1 rounded-md hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Separator */}
            <span className="text-xl font-bold text-slate-400 mt-[-2px]">:</span>

            {/* Minute */}
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={incrementMinute}
                className="p-1 rounded-md hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <div className="w-12 h-10 flex items-center justify-center bg-blue-50 rounded-lg text-lg font-bold text-blue-700 border border-blue-200">
                {minute.toString().padStart(2, '0')}
              </div>
              <button
                type="button"
                onClick={decrementMinute}
                className="p-1 rounded-md hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* AM/PM Toggle */}
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={togglePeriod}
                className="p-1 rounded-md hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <div
                onClick={togglePeriod}
                className="w-12 h-10 flex items-center justify-center bg-indigo-50 rounded-lg text-sm font-bold text-indigo-700 border border-indigo-200 cursor-pointer select-none hover:bg-indigo-100 transition-colors"
              >
                {period}
              </div>
              <button
                type="button"
                onClick={togglePeriod}
                className="p-1 rounded-md hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Done Button */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="mt-3 w-full py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
