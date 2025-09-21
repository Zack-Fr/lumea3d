import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconColor: 'text-red-400',
          confirmButtonClass: 'bg-red-500 hover:bg-red-600 focus:ring-red-500',
          iconBgClass: 'bg-red-500/10',
        };
      case 'warning':
        return {
          iconColor: 'text-yellow-400',
          confirmButtonClass: 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500',
          iconBgClass: 'bg-yellow-500/10',
        };
      case 'info':
        return {
          iconColor: 'text-blue-400',
          confirmButtonClass: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500',
          iconBgClass: 'bg-blue-500/10',
        };
      default:
        return {
          iconColor: 'text-red-400',
          confirmButtonClass: 'bg-red-500 hover:bg-red-600 focus:ring-red-500',
          iconBgClass: 'bg-red-500/10',
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2, type: "spring", damping: 25, stiffness: 300 }}
            className="bg-gray-800/95 backdrop-blur-md text-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-700/50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl ${variantStyles.iconBgClass}`}>
                  <AlertTriangle className={`w-5 h-5 ${variantStyles.iconColor}`} />
                </div>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
              </div>
              {!isLoading && (
                <button
                  onClick={handleCancel}
                  className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-300 leading-relaxed">{message}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 p-6 bg-gray-900/50 rounded-b-2xl">
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className={`px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors font-medium ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className={`px-6 py-2 text-white rounded-lg font-medium transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                  variantStyles.confirmButtonClass
                } ${
                  isLoading
                    ? 'opacity-75 cursor-not-allowed'
                    : 'transform hover:scale-105 active:scale-95'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;