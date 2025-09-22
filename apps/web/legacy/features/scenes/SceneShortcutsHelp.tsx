import { useState } from 'react';
import { X, Keyboard, Search } from 'lucide-react';
import { formatShortcut, type KeyboardShortcut } from '../../../src/features/scenes/useSceneKeyboardShortcuts';

interface SceneShortcutsHelpProps {
    shortcuts: KeyboardShortcut[];
    isVisible: boolean;
    onClose: () => void;
}

export function SceneShortcutsHelp({ shortcuts, isVisible, onClose }: SceneShortcutsHelpProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isVisible) return null;

  // Filter shortcuts based on search and category
    const filteredShortcuts = shortcuts.filter(shortcut => {
    const matchesSearch = searchQuery === '' || 
        shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        formatShortcut(shortcut).toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || shortcut.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
    });

  // Group shortcuts by category
    const groupedShortcuts = filteredShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
    }, {} as Record<string, KeyboardShortcut[]>);

  // Get unique categories
    const categories = Array.from(new Set(shortcuts.map(s => s.category))).sort();

    return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div className="bg-gray-900 text-white rounded-lg border border-gray-600 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
        <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
            </div>
            <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-700 transition-colors"
            >
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-600 space-y-3">
          {/* Search */}
        <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
                type="text"
                placeholder="Search shortcuts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
            </div>

          {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
            <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
            All Categories
            </button>
            {categories.map(category => (
            <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
                {category}
            </button>
            ))}
        </div>
        </div>

        {/* Shortcuts List */}
        <div className="overflow-y-auto max-h-[60vh] p-4">
        {Object.keys(groupedShortcuts).length === 0 ? (
            <div className="text-center text-gray-400 py-8">
            <Keyboard className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No shortcuts found matching your criteria</p>
            </div>
        ) : (
            <div className="space-y-6">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                <div key={category}>
                <h3 className="text-sm font-semibold text-blue-400 mb-3 uppercase tracking-wide">
                    {category}
                </h3>
                <div className="grid gap-2">
                    {(categoryShortcuts as KeyboardShortcut[]).map((shortcut: KeyboardShortcut, index: number) => (
                    <div
                        key={`${category}-${index}`}
                        className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                    >
                        <span className="text-gray-200">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                        {formatShortcut(shortcut).split('+').map((key, keyIndex) => (
                            <span
                            key={keyIndex}
                            className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs font-mono text-gray-300"
                            >
                            {key}
                            </span>
                        ))}
                        </div>
                    </div>
                    ))}
                </div>
                </div>
            ))}
            </div>
        )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-600 bg-gray-800 text-sm text-gray-400">
        <div className="flex items-center justify-between">
            <span>
            Showing {filteredShortcuts.length} of {shortcuts.length} shortcuts
            </span>
            <span className="flex items-center gap-2">
            Press <span className="px-1 py-0.5 bg-gray-700 rounded text-xs">?</span> to toggle this panel
            </span>
        </div>
        </div>
    </div>
    </div>
);
}

// Hook to manage shortcuts help visibility
export function useSceneShortcutsHelp() {
    const [isVisible, setIsVisible] = useState(false);

    const show = () => setIsVisible(true);
    const hide = () => setIsVisible(false);
    const toggle = () => setIsVisible(!isVisible);

    return {
    isVisible,
    show,
    hide,
    toggle
    };
}