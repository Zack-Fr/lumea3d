import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  disabled = false,
  required = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(option => option.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          w-full bg-gray-700/80 backdrop-blur-sm border border-gray-600/50 rounded-lg px-4 py-3 
          text-left transition-all duration-200 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50
          ${disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:bg-gray-600/80 hover:border-gray-500/50 cursor-pointer'
          }
          ${isOpen ? 'ring-2 ring-blue-400/50 border-blue-400/50' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {selectedOption ? (
              <div>
                <div className="text-white font-medium">
                  {selectedOption.label}
                </div>
                {selectedOption.description && (
                  <div className="text-sm text-gray-400 truncate">
                    {selectedOption.description}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-400">{placeholder}</div>
            )}
          </div>
          <ChevronDown 
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute w-full mt-2 bg-gray-900 border border-gray-600 rounded-xl shadow-2xl overflow-hidden backdrop-blur-sm"
            style={{ zIndex: 9999, backgroundColor: 'rgba(17, 24, 39, 0.98)' }}
          >
            <div className="max-h-60 overflow-y-auto">
              {options.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`
                    w-full px-4 py-3 text-left transition-all duration-150 flex items-center justify-between
                    hover:bg-gray-700 focus:bg-gray-700 focus:outline-none
                    ${option.value === value ? 'text-blue-300 font-medium' : 'text-white'}
                    ${index === 0 ? 'rounded-t-xl' : ''}
                    ${index === options.length - 1 ? 'rounded-b-xl' : ''}
                  `}
                  style={{
                    backgroundColor: option.value === value ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                    borderLeft: option.value === value ? '3px solid rgb(59, 130, 246)' : 'none'
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">
                      {option.label}
                    </div>
                    {option.description && (
                      <div className={`text-sm truncate ${
                        option.value === value ? 'text-blue-200' : 'text-gray-400'
                      }`}>
                        {option.description}
                      </div>
                    )}
                  </div>
                  {option.value === value && (
                    <Check className="w-4 h-4 text-blue-400 flex-shrink-0 ml-2" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden input for form validation */}
      {required && (
        <input
          type="hidden"
          value={value}
          required={required}
          onChange={() => {}} // Controlled by the select component
        />
      )}
    </div>
  );
};

export default CustomSelect;