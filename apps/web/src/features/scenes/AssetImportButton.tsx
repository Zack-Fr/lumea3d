import { useState } from 'react';
import { Plus, Package } from 'lucide-react';
import { AssetImportModal } from './AssetImportModal';

interface AssetImportButtonProps {
    onImportComplete?: (assetId: string) => void;
    className?: string;
    variant?: 'sidebar' | 'floating' | 'inline';
}

export function AssetImportButton({ 
    onImportComplete, 
    className = '',
    variant = 'floating'
    }: AssetImportButtonProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleImportComplete = (assetId: string) => {
console.log('✅ AssetImport: Import completed for asset:', assetId);
onImportComplete?.(assetId);
setIsModalOpen(false);
};

if (variant === 'sidebar') {
return (
    <>
        <button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center space-x-2 w-full p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors ${className}`}
        title="Import new 3D asset"
        >
        <Plus size={16} />
        <span className="text-sm font-medium">Import Asset</span>
        </button>

        <AssetImportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onImportComplete={handleImportComplete}
        />
      </>
    );
  }

  if (variant === 'inline') {
    return (
      <>
        <button
        onClick={() => setIsModalOpen(true)}
        className={`inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors ${className}`}
        title="Import new 3D asset"
        >
          <Package size={16} />
          <span className="text-sm font-medium">Import Asset</span>
        </button>

        <AssetImportModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onImportComplete={handleImportComplete}
        />
      </>
    );
  }

  // Default: floating variant
  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`fixed bottom-6 left-6 z-40 flex items-center space-x-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all hover:scale-105 ${className}`}
        title="Import new 3D asset"
      >
        <Plus size={20} />
        <span className="text-sm font-medium">Import</span>
      </button>

      <AssetImportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onImportComplete={handleImportComplete}
      />
    </>
  );
}