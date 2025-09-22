import { useState, useEffect } from 'react';
import { InstancedObject } from '../../../legacy/features/scenes/InstancedRenderer';

interface SafeInstancedObjectProps {
  glbUrl: string;
  items: Array<{
    id: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  }>;
  categoryKey?: string;
  frustumCulling?: boolean;
  maxInstances?: number;
  fallbackColor?: string;
  progressive?: boolean;
  batchSize?: number;
}

export function SafeInstancedObject({ 
  glbUrl, 
  items, 
  categoryKey = 'unknown',
  frustumCulling, 
  maxInstances, 
  fallbackColor = 'red',
  progressive,
  batchSize
}: SafeInstancedObjectProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Test if the URL is accessible
    console.log(`🔍 SafeInstancedObject: Received glbUrl:`, glbUrl);
console.log(`🔍 SafeInstancedObject: glbUrl length:`, glbUrl.length);  
console.log(`🔍 SafeInstancedObject: Testing URL accessibility: ${glbUrl}`);
    
    fetch(glbUrl, { method: 'HEAD' })
      .then(response => {
        console.log(`✅ SafeInstancedObject: URL test result for ${glbUrl}:`, response.status);
        if (response.ok) {
          setHasError(false);
        } else {
          console.warn(`⚠️ SafeInstancedObject: URL not accessible (${response.status}): ${glbUrl}`);
          setHasError(true);
        }
        setIsLoading(false);
      })
      .catch(error => {
        console.error(`❌ SafeInstancedObject: URL test failed for ${glbUrl}:`, error);
        setHasError(true);
        setIsLoading(false);
      });
  }, [glbUrl]);

  if (isLoading) {
    // Show loading wireframes
    return (
      <group>
        {items.map((item) => (
          <mesh 
            key={item.id} 
            position={item.position} 
            rotation={item.rotation} 
            scale={item.scale}
            userData={{
              itemId: item.id,
              category: categoryKey,
              selectable: true,
              locked: false,
              meta: { isLoading: true }
            }}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="cyan" wireframe />
          </mesh>
        ))}
      </group>
    );
  }

  if (hasError) {
    // Show error wireframes
    console.log(`🔴 SafeInstancedObject: Rendering fallback for ${items.length} items (${glbUrl} failed)`);
    return (
      <group>
        {items.map((item) => (
          <mesh 
            key={item.id} 
            position={item.position} 
            rotation={item.rotation} 
            scale={item.scale}
            userData={{
              itemId: item.id,
              category: categoryKey,
              selectable: true,
              locked: false,
              meta: { hasError: true }
            }}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={fallbackColor} wireframe />
          </mesh>
        ))}
      </group>
    );
  }

  // Try to render the actual GLB
  try {
    return (
      <InstancedObject
        glbUrl={glbUrl}
        items={items}
        frustumCulling={frustumCulling}
        maxInstances={maxInstances}
        progressive={progressive}
        batchSize={batchSize}
        categoryKey={categoryKey}
      />
    );
  } catch (error) {
    console.error(`❌ SafeInstancedObject: Runtime error rendering ${glbUrl}:`, error);
    // Fallback to wireframes on runtime error
    return (
      <group>
        {items.map((item) => (
          <mesh 
            key={item.id} 
            position={item.position} 
            rotation={item.rotation} 
            scale={item.scale}
            userData={{
              itemId: item.id,
              category: categoryKey,
              selectable: true,
              locked: false,
              meta: { runtimeError: true }
            }}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="magenta" wireframe />
          </mesh>
        ))}
      </group>
    );
  }
}
