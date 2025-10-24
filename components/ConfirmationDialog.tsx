import React from 'react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  confirmButtonText?: string;
  confirmButtonClass?: string;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  children,
  confirmButtonText = 'Confirmar Eliminación',
  confirmButtonClass = 'bg-red-600 text-white hover:bg-red-500 focus:ring-red-400',
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div 
        className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-text-primary mb-4">{title}</h2>
        <div className="text-text-secondary mb-6">
          {children}
        </div>
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-text-primary font-semibold rounded-md hover:bg-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 ${confirmButtonClass}`}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};