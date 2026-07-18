import React from 'react';

type AlertDialogProps = {
  isOpen: boolean;
  title?: string;
  message: string;
  onClose: () => void;
  type?: 'error' | 'success' | 'info';
};

export default function AlertDialog({
  isOpen,
  title,
  message,
  onClose,
  type = 'error'
}: AlertDialogProps) {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return {
          bg: 'bg-red-50 border-red-200',
          title: 'text-red-800',
          message: 'text-red-700',
          button: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
        };
      case 'success':
        return {
          bg: 'bg-emerald-50 border-emerald-200',
          title: 'text-emerald-800',
          message: 'text-emerald-700',
          button: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500'
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          title: 'text-blue-800',
          message: 'text-blue-700',
          button: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-slate-900/50 backdrop-blur-sm p-4">
      <div className={`relative w-full max-w-sm bg-white rounded-2xl shadow-xl border overflow-hidden transform transition-all ${styles.bg}`}>
        <div className="p-6">
          {title && <h3 className={`text-lg font-semibold mb-2 ${styles.title}`}>{title}</h3>}
          <p className={`whitespace-pre-line ${styles.message}`}>{message}</p>
        </div>
        <div className="px-6 py-4 border-t border-black/5 flex justify-end">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.button}`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
