import { useMemo } from 'react';
import { Color } from 'three';

interface GridSystemProps {
  size?: number;
  divisions?: number;
  colorCenterLine?: string;
  colorGrid?: string;
  visible?: boolean;
  fadeDistance?: number;
}

export function GridSystem({
  size = 50,
  divisions = 50,
  colorCenterLine = '#ffffff',
  colorGrid = '#888888',
  visible = true,
  fadeDistance: _fadeDistance = 100, // Prefix with underscore to indicate unused
}: GridSystemProps) {
  // Create grid geometry
  const { positions, colors } = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    
    const step = size / divisions;
    const halfSize = size / 2;
    
    const centerColor = new Color(colorCenterLine);
    const gridColor = new Color(colorGrid);
    
    // Create grid lines
    for (let i = 0; i <= divisions; i++) {
      const pos = -halfSize + i * step;
      
      // Determine line color (center lines are brighter)
      const isCenter = Math.abs(pos) < 0.001;
      const currentColor = isCenter ? centerColor : gridColor;
      
      // X-axis lines (running parallel to Z-axis)
      positions.push(-halfSize, 0, pos, halfSize, 0, pos);
      colors.push(currentColor.r, currentColor.g, currentColor.b);
      colors.push(currentColor.r, currentColor.g, currentColor.b);
      
      // Z-axis lines (running parallel to X-axis)
      positions.push(pos, 0, -halfSize, pos, 0, halfSize);
      colors.push(currentColor.r, currentColor.g, currentColor.b);
      colors.push(currentColor.r, currentColor.g, currentColor.b);
    }
    
    return {
      positions: new Float32Array(positions),
      colors: new Float32Array(colors)
    };
  }, [size, divisions, colorCenterLine, colorGrid]);
  
  if (!visible) return null;
  
  return (
    <group name="grid-system">
      {/* Main Grid */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={positions}
            count={positions.length / 3}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            array={colors}
            count={colors.length / 3}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors={true}
          transparent={true}
          opacity={0.3}
          fog={false}
        />
      </lineSegments>
      
      {/* Origin Axes */}
      <group name="origin-axes">
        {/* X Axis - Red */}
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array([0, 0, 0, 5, 0, 0])}
              count={2}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ff0000" linewidth={3} transparent opacity={0.7} />
        </lineSegments>
        
        {/* Y Axis - Green */}
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array([0, 0, 0, 0, 5, 0])}
              count={2}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#00ff00" linewidth={3} transparent opacity={0.7} />
        </lineSegments>
        
        {/* Z Axis - Blue */}
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array([0, 0, 0, 0, 0, 5])}
              count={2}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#0000ff" linewidth={3} transparent opacity={0.7} />
        </lineSegments>
      </group>
      
      {/* Origin Point Marker */}
      <mesh name="origin-marker" position={[0, 0, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

export default GridSystem;
