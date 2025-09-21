import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, FolderPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CreateSceneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (sceneName: string) => void;
  isLoading?: boolean;
}

export const CreateSceneModal: React.FC<CreateSceneModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [sceneName, setSceneName] = useState('');
  const [error, setError] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSceneName('');
      setError('');
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = sceneName.trim();
    
    // Validation
    if (!trimmedName) {
      setError('Scene name is required');
      return;
    }
    
    if (trimmedName.length < 2) {
      setError('Scene name must be at least 2 characters long');
      return;
    }
    
    if (trimmedName.length > 50) {
      setError('Scene name must be less than 50 characters');
      return;
    }
    
    // Basic validation for special characters
    if (!/^[a-zA-Z0-9\s\-_\.]+$/.test(trimmedName)) {
      setError('Scene name can only contain letters, numbers, spaces, hyphens, underscores, and dots');
      return;
    }
    
    setError('');
    onConfirm(trimmedName);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSceneName(e.target.value);
    if (error) {
      setError('');
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          style={{ 
            zIndex: 10000,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            position: 'fixed'
          }}
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2, type: "spring", damping: 25, stiffness: 300 }}
            className="bg-gray-800 text-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-700"
            style={{ backgroundColor: 'rgba(31, 41, 55, 0.98)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-blue-500/20">
                  <FolderPlus className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Create New Scene</h3>
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
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label 
                    htmlFor="sceneName" 
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Scene Name
                  </label>
                  <input
                    id="sceneName"
                    type="text"
                    value={sceneName}
                    onChange={handleInputChange}
                    placeholder="Enter scene name..."
                    disabled={isLoading}
                    className={`
                      w-full px-4 py-3 bg-gray-700/80 backdrop-blur-sm border rounded-lg 
                      text-white placeholder-gray-400 transition-all duration-200
                      focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 focus:outline-none
                      ${error 
                        ? 'border-red-400/50 ring-2 ring-red-400/20' 
                        : 'border-gray-600/50 hover:border-gray-500/50'
                      }
                      ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    autoFocus
                    maxLength={50}
                  />
                  {error && (
                    <div className="mt-2 text-sm text-red-400 flex items-center space-x-1">
                      <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                      <span>{error}</span>
                    </div>
                  )}
                  <div className="mt-1 text-xs text-gray-400">
                    {sceneName.length}/50 characters
                  </div>
                </div>

                <div className="text-sm text-gray-400 bg-gray-700/30 rounded-lg p-3">
                  <strong className="text-gray-300">Tip:</strong> Choose a descriptive name that helps you identify this scene later.
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-700/50 mt-6">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className={`px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors font-medium ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !sceneName.trim() || !!error}
                  className={`px-6 py-2 text-white rounded-lg font-medium transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 ${
                    isLoading || !sceneName.trim() || !!error
                      ? 'bg-gray-600 cursor-not-allowed opacity-75'
                      : 'bg-blue-500 hover:bg-blue-600 transform hover:scale-105 active:scale-95'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Plus className="w-4 h-4" />
                      <span>Create Scene</span>
                    </div>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default CreateSceneModal;