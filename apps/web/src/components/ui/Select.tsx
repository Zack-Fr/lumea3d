import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({ children, className, ...props }) => {
  return (
    <select 
      className={`px-3 py-2 border border-gray-100 bg-[var(--glass-maroon)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className || ''}`}
      {...props}
    >
      {children}
    </select>
  );
};

export const SelectItem: React.FC<SelectItemProps> = ({ value, children }) => {
  return <option value={value}>{children}</option>;
};

// For compatibility with the ScaleUnitSystem component
export const SelectTrigger = Select;
export const SelectValue = () => null;
export const SelectContent: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
