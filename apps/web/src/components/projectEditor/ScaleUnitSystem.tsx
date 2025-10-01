import React from 'react';
import { Button } from '../ui/Button';
import { Select, SelectItem } from '../ui/Select';
import { Ruler, Info } from 'lucide-react';

export type ScaleUnit = 'mm' | 'cm' | 'm' | 'ft' | 'in';

export interface ScaleSystemProps {
  currentUnit: ScaleUnit;
  sceneScale: number; // Base scale multiplier (1.0 = 1 unit)
  onUnitChange: (unit: ScaleUnit) => void;
  onScaleChange: (scale: number) => void;
  className?: string;
}

// Unit conversion utilities
export const SCALE_UNITS: Record<ScaleUnit, { name: string; symbol: string; toMeters: number; precision: number }> = {
  mm: { name: 'Millimeters', symbol: 'mm', toMeters: 0.001, precision: 0 },
  cm: { name: 'Centimeters', symbol: 'cm', toMeters: 0.01, precision: 1 },
  m: { name: 'Meters', symbol: 'm', toMeters: 1.0, precision: 2 },
  ft: { name: 'Feet', symbol: 'ft', toMeters: 0.3048, precision: 2 },
  in: { name: 'Inches', symbol: 'in', toMeters: 0.0254, precision: 1 }
};

export const convertValue = (value: number, fromUnit: ScaleUnit, toUnit: ScaleUnit): number => {
  const fromMeters = SCALE_UNITS[fromUnit].toMeters;
  const toMeters = SCALE_UNITS[toUnit].toMeters;
  return (value * fromMeters) / toMeters;
};

export const formatValue = (value: number, unit: ScaleUnit): string => {
  const unitConfig = SCALE_UNITS[unit];
  return `${value.toFixed(unitConfig.precision)} ${unitConfig.symbol}`;
};

const ScaleUnitSystem: React.FC<ScaleSystemProps> = ({
  currentUnit,
  sceneScale,
  onUnitChange,
  onScaleChange,
  className
}) => {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <Ruler className="w-4 h-4 text-[var(--glass-yellow)]" />
        <span className="text-sm font-medium text-[var(--glass-yellow)]">Scene Scale</span>
        <Info className="w-3 h-3 text-[var(--glass-yellow)] cursor-help" />
      </div>
      
      <div className="space-y-3">
        {/* Unit Selection */}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Display Units</label>
          <Select 
            value={currentUnit} 
            onChange={(e) => onUnitChange(e.target.value as ScaleUnit)}
            className="w-full h-8 text-sm"
          >
            {Object.entries(SCALE_UNITS).map(([unit, config]) => (
              <SelectItem key={unit} value={unit}>
                {config.name} ({config.symbol})
              </SelectItem>
            ))}
          </Select>
        </div>
        
        {/* Scale Factor */}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">
            Scale Factor ({formatValue(1, currentUnit)} = {sceneScale.toFixed(2)} scene units)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0.1"
              max="10"
              step="0.1"
              value={sceneScale}
              onChange={(e) => onScaleChange(parseFloat(e.target.value))}
              className="flex-1 h-2"
              style={{
                background: 'linear-gradient(to right, var(--glass-maroon) 0%, var(--glass-yellow) 100%)',
                borderRadius: '3px',
                outline: 'none',
                WebkitAppearance: 'none',
                appearance: 'none',
                cursor: 'pointer'
              }}
            />
            <span className="text-xs text-gray-500 min-w-[3rem] text-right">
              {sceneScale.toFixed(1)}x
            </span>
          </div>
        </div>
        
        {/* Scale Presets */}
        <div>
          <label className="text-xs text-gray-600 mb-2 block">Common Scales</label>
          <div className="flex flex-wrap gap-1">
            <Button
              variant="outline"
              size="sm"
              className="text-xs px-2 py-1 h-6"
              onClick={() => {
                onUnitChange('cm');
                onScaleChange(1.0);
              }}
            >
              Furniture (cm)
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs px-2 py-1 h-6"
              onClick={() => {
                onUnitChange('m');
                onScaleChange(1.0);
              }}
            >
              Architecture (m)
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs px-2 py-1 h-6"
              onClick={() => {
                onUnitChange('ft');
                onScaleChange(1.0);
              }}
            >
              Imperial (ft)
            </Button>
          </div>
        </div>
        
        {/* Current Scale Info */}
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          <div className="font-medium mb-1">Scene Info:</div>
          <div>1 scene unit = {formatValue(sceneScale, currentUnit)}</div>
          <div>Grid spacing = {formatValue(sceneScale, currentUnit)}</div>
        </div>
      </div>
    </div>
  );
};

export default ScaleUnitSystem;
