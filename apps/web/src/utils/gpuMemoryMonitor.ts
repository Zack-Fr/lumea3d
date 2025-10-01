/**
 * GPU Memory Monitor
 * 
 * Utilities to monitor GPU memory usage and detect potential context loss scenarios
 * before they occur, helping prevent the mesh disappearing issue.
 */

export interface GPUMemoryInfo {
  totalJSHeapSize: number;
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
  webglVendor: string;
  webglRenderer: string;
  maxTextureSize: number;
  maxRenderbufferSize: number;
  maxVertexTextureImageUnits: number;
  maxFragmentUniformVectors: number;
  memoryPressureLevel: 'low' | 'moderate' | 'high' | 'critical';
  currentFPS: number;
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  performanceLevel: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface InstanceLoadingRecommendation {
  maxSafeInstances: number;
  recommendedBatchSize: number;
  useProgressive: boolean;
  warnings: string[];
}

class GPUMemoryMonitor {
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private memoryInfo: GPUMemoryInfo | null = null;
  private lastCheck = 0;
  private checkInterval = 5000; // Check every 5 seconds
  private isUpdating = false; // Prevent recursive updates
  
  // FPS tracking
  private frameCount = 0;
  private lastFrameTime = 0;
  private fpsHistory: number[] = [];
  private maxFPSHistory = 60; // Keep last 60 FPS samples (roughly 1 second at 60fps)
  private currentFPS = 0;
  private isTracking = false;
  
  initialize(gl: WebGLRenderingContext | WebGL2RenderingContext) {
    this.gl = gl;
    this.updateMemoryInfo();
    this.startFPSTracking();
    
    console.log('🖥️ GPU Memory Monitor initialized');
    console.log('🔍 GPU Info:', {
      vendor: this.memoryInfo?.webglVendor,
      renderer: this.memoryInfo?.webglRenderer,
      maxTextureSize: this.memoryInfo?.maxTextureSize,
      memoryPressure: this.memoryInfo?.memoryPressureLevel,
      fps: this.currentFPS
    });
  }
  
  private updateMemoryInfo(): void {
    if (!this.gl) {
      console.warn('⚠️ GPU Memory Monitor: WebGL context not available');
      return;
    }
    
    if (this.isUpdating) {
      console.warn('⚠️ GPU Memory Monitor: Update already in progress, skipping');
      return;
    }
    
    this.isUpdating = true;
    
    try {
      // Check WebGL context health first
      if (this.gl && typeof this.gl.isContextLost === 'function' && this.gl.isContextLost()) {
        console.error('🚨 WebGL context lost detected!');
        this.handleContextLoss();
        return;
      }

      // Get performance memory info (Chrome only)
      const perfMemory = (performance as any).memory;
      const hasPerformanceMemory = !!perfMemory;
      
      const jsHeapInfo = perfMemory ? {
        totalJSHeapSize: perfMemory.totalJSHeapSize,
        usedJSHeapSize: perfMemory.usedJSHeapSize,
        jsHeapSizeLimit: perfMemory.jsHeapSizeLimit
      } : {
        totalJSHeapSize: 0,
        usedJSHeapSize: 0,
        jsHeapSizeLimit: 0
      };
      
      if (!hasPerformanceMemory) {
        console.warn('⚠️ performance.memory API not available (Chrome-only feature)');
      }
      
      // Get WebGL context info with better error handling
      let debugInfo: any = null;
      let vendor = 'Unknown';
      let renderer = 'Unknown';
      
      try {
        debugInfo = this.gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          vendor = this.gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Unknown';
          renderer = this.gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown';
        } else {
          console.warn('⚠️ WEBGL_debug_renderer_info extension not available (may be blocked for privacy)');
          // Try alternative GPU detection methods
          const alternativeInfo = this.detectGPUFallback();
          vendor = alternativeInfo.vendor;
          renderer = alternativeInfo.renderer;
        }
      } catch (debugError) {
        console.warn('⚠️ Failed to get GPU debug info:', typeof debugError === 'object' && debugError !== null && 'message' in debugError ? (debugError as any).message : debugError);
        const alternativeInfo = this.detectGPUFallback();
        vendor = alternativeInfo.vendor;
        renderer = alternativeInfo.renderer;
      }
      
      // Get WebGL capabilities with error handling
      let maxTextureSize = 0;
      let maxRenderbufferSize = 0;
      let maxVertexTextureImageUnits = 0;
      let maxFragmentUniformVectors = 0;
      
      try {
        maxTextureSize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE) || 0;
        maxRenderbufferSize = this.gl.getParameter(this.gl.MAX_RENDERBUFFER_SIZE) || 0;
        maxVertexTextureImageUnits = this.gl.getParameter(this.gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) || 0;
        maxFragmentUniformVectors = this.gl.getParameter(this.gl.MAX_FRAGMENT_UNIFORM_VECTORS) || 0;
      } catch (paramError) {
        console.warn('⚠️ Failed to get WebGL parameters:', typeof paramError === 'object' && paramError !== null && 'message' in paramError ? (paramError as any).message : paramError);
        // Use safe defaults
        maxTextureSize = 2048; // Conservative default
        maxRenderbufferSize = 2048;
        maxVertexTextureImageUnits = 8;
        maxFragmentUniformVectors = 256;
      }
      
      // Calculate memory pressure level
      const memoryUsageRatio = jsHeapInfo.jsHeapSizeLimit > 0 
        ? jsHeapInfo.usedJSHeapSize / jsHeapInfo.jsHeapSizeLimit 
        : 0;
        
      let memoryPressureLevel: GPUMemoryInfo['memoryPressureLevel'] = 'low';
      if (memoryUsageRatio > 0.9) memoryPressureLevel = 'critical';
      else if (memoryUsageRatio > 0.7) memoryPressureLevel = 'high';
      else if (memoryUsageRatio > 0.5) memoryPressureLevel = 'moderate';
      
      // Calculate FPS metrics
      const averageFPS = this.fpsHistory.length > 0 
        ? this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length 
        : this.currentFPS;
      const minFPS = this.fpsHistory.length > 0 ? Math.min(...this.fpsHistory) : this.currentFPS;
      const maxFPS = this.fpsHistory.length > 0 ? Math.max(...this.fpsHistory) : this.currentFPS;
      
      // Determine performance level based on FPS
      let performanceLevel: GPUMemoryInfo['performanceLevel'] = 'excellent';
      if (averageFPS < 15) performanceLevel = 'poor';
      else if (averageFPS < 30) performanceLevel = 'fair';
      else if (averageFPS < 50) performanceLevel = 'good';
      // else remains 'excellent'
      
      this.memoryInfo = {
        ...jsHeapInfo,
        webglVendor: vendor,
        webglRenderer: renderer,
        maxTextureSize,
        maxRenderbufferSize,
        maxVertexTextureImageUnits,
        maxFragmentUniformVectors,
        memoryPressureLevel,
        currentFPS: this.currentFPS,
        averageFPS,
        minFPS,
        maxFPS,
        performanceLevel
      };
      
      this.lastCheck = Date.now();
      
    } catch (error) {
      const errorDetails = {
        message: typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : 'Unknown error',
        name: typeof error === 'object' && error !== null && 'name' in error ? (error as any).name : 'Error',
        stack: typeof error === 'object' && error !== null && 'stack' in error ? (error as any).stack : undefined,
        webglAvailable: !!this.gl,
        contextLost: this.gl && typeof this.gl.isContextLost === 'function' ? this.gl.isContextLost() : 'unknown',
        performanceMemoryAvailable: !!(performance as any).memory,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      };
      
      console.warn('⚠️ Failed to update GPU memory info:', errorDetails);
      
      // Set fallback memory info to prevent null reference errors
      this.memoryInfo = {
        totalJSHeapSize: 0,
        usedJSHeapSize: 0,
        jsHeapSizeLimit: 0,
        webglVendor: 'Unknown',
        webglRenderer: 'Unknown',
        maxTextureSize: 2048,
        maxRenderbufferSize: 2048,
        maxVertexTextureImageUnits: 8,
        maxFragmentUniformVectors: 256,
        memoryPressureLevel: 'moderate', // Conservative fallback
        currentFPS: this.currentFPS,
        averageFPS: this.currentFPS,
        minFPS: this.currentFPS,
        maxFPS: this.currentFPS,
        performanceLevel: 'fair' // Conservative fallback
      };
    } finally {
      this.isUpdating = false;
    }
  }
  
  /**
   * Check if it's safe to load the specified number of instances
   */
  checkMemoryBeforeInstanceLoading(instanceCount: number, modelComplexity: 'low' | 'medium' | 'high' = 'medium'): InstanceLoadingRecommendation {
    // Update memory info if it's been a while
    if (Date.now() - this.lastCheck > this.checkInterval) {
      this.updateMemoryInfo();
    }
    
    const warnings: string[] = [];
    let maxSafeInstances = instanceCount;
    let recommendedBatchSize = Math.min(5, instanceCount);
    let useProgressive = instanceCount > 10;
    
    if (!this.memoryInfo) {
      warnings.push('GPU memory info unavailable - using conservative defaults');
      maxSafeInstances = Math.min(instanceCount, 15);
      useProgressive = instanceCount > 8;
      recommendedBatchSize = 3;
      
      return { maxSafeInstances, recommendedBatchSize, useProgressive, warnings };
    }
    
    // Adjust recommendations based on memory pressure
    switch (this.memoryInfo.memoryPressureLevel) {
      case 'critical':
        warnings.push('⚠️ CRITICAL memory pressure detected - severely limiting instances');
        maxSafeInstances = Math.min(instanceCount, 5);
        useProgressive = instanceCount > 3;
        recommendedBatchSize = 1;
        break;
        
      case 'high':
        warnings.push('⚠️ High memory pressure - reducing instance count');
        maxSafeInstances = Math.min(instanceCount, 10);
        useProgressive = instanceCount > 5;
        recommendedBatchSize = 2;
        break;
        
      case 'moderate':
        warnings.push('Moderate memory pressure - using progressive loading');
        maxSafeInstances = Math.min(instanceCount, 20);
        useProgressive = instanceCount > 8;
        recommendedBatchSize = 3;
        break;
        
      default: // low
        // Use defaults but adjust for model complexity
        break;
    }
    
    // Adjust recommendations based on performance level
    switch (this.memoryInfo.performanceLevel) {
      case 'poor':
        warnings.push(`⚠️ Poor performance detected (${this.memoryInfo.averageFPS.toFixed(1)} FPS) - severely limiting instances`);
        maxSafeInstances = Math.floor(maxSafeInstances * 0.3);
        useProgressive = instanceCount > 2;
        recommendedBatchSize = 1;
        break;
        
      case 'fair':
        warnings.push(`⚠️ Fair performance (${this.memoryInfo.averageFPS.toFixed(1)} FPS) - reducing instances`);
        maxSafeInstances = Math.floor(maxSafeInstances * 0.6);
        useProgressive = instanceCount > 4;
        recommendedBatchSize = Math.min(recommendedBatchSize, 2);
        break;
        
      case 'good':
        warnings.push(`Moderate performance (${this.memoryInfo.averageFPS.toFixed(1)} FPS) - using conservative loading`);
        maxSafeInstances = Math.floor(maxSafeInstances * 0.8);
        useProgressive = instanceCount > 6;
        break;
        
      default: // excellent
        // No additional limitations needed
        break;
    }
    
    // Adjust for model complexity
    if (modelComplexity === 'high') {
      warnings.push('High complexity model detected - reducing instances');
      maxSafeInstances = Math.floor(maxSafeInstances * 0.6);
      useProgressive = instanceCount > 5;
      recommendedBatchSize = Math.min(recommendedBatchSize, 2);
    } else if (modelComplexity === 'low') {
      maxSafeInstances = Math.floor(maxSafeInstances * 1.5);
      recommendedBatchSize = Math.min(recommendedBatchSize + 2, 8);
    }
    
    // Check GPU-specific limitations
    if (this.memoryInfo.webglRenderer.toLowerCase().includes('intel')) {
      warnings.push('Intel GPU detected - using conservative instance limits');
      maxSafeInstances = Math.floor(maxSafeInstances * 0.7);
      useProgressive = instanceCount > 6;
    }
    
    if (this.memoryInfo.maxTextureSize < 4096) {
      warnings.push('Low GPU texture capability detected');
      maxSafeInstances = Math.floor(maxSafeInstances * 0.8);
    }
    
    return {
      maxSafeInstances: Math.max(1, maxSafeInstances),
      recommendedBatchSize: Math.max(1, recommendedBatchSize),
      useProgressive,
      warnings
    };
  }
  
  /**
   * Estimate model complexity based on URL and naming patterns
   */
  estimateModelComplexity(glbUrl: string): 'low' | 'medium' | 'high' {
    const url = glbUrl.toLowerCase();
    
    // High complexity indicators
    if (url.includes('vehicle') || url.includes('car') || url.includes('van') || 
        url.includes('detailed') || url.includes('complex') || url.includes('hq')) {
      return 'high';
    }
    
    // Low complexity indicators  
    if (url.includes('simple') || url.includes('basic') || url.includes('box') || 
        url.includes('primitive') || url.includes('low_poly')) {
      return 'low';
    }
    
    // Default to medium
    return 'medium';
  }
  
  /**
   * Get current memory status
   */
  getMemoryStatus(): GPUMemoryInfo | null {
    if (Date.now() - this.lastCheck > this.checkInterval) {
      this.updateMemoryInfo();
    }
    return this.memoryInfo;
  }
  
  /**
   * Start FPS tracking
   */
  private startFPSTracking(): void {
    if (this.isTracking) return;
    
    this.isTracking = true;
    this.lastFrameTime = performance.now();
    
    const trackFrame = () => {
      if (!this.isTracking) return;
      
      const currentTime = performance.now();
      const deltaTime = currentTime - this.lastFrameTime;
      
      if (deltaTime > 0) {
        this.currentFPS = 1000 / deltaTime;
        
        // Add to history
        this.fpsHistory.push(this.currentFPS);
        if (this.fpsHistory.length > this.maxFPSHistory) {
          this.fpsHistory.shift(); // Remove oldest
        }
      }
      
      this.frameCount++;
      this.lastFrameTime = currentTime;
      
      // Continue tracking
      requestAnimationFrame(trackFrame);
    };
    
    requestAnimationFrame(trackFrame);
  }
  
  /**
   * Stop FPS tracking
   */
  stopFPSTracking(): void {
    this.isTracking = false;
  }
  
  /**
   * Get current FPS
   */
  getCurrentFPS(): number {
    return this.currentFPS;
  }
  
  /**
   * Get FPS statistics
   */
  getFPSStats(): { current: number; average: number; min: number; max: number } {
    const average = this.fpsHistory.length > 0 
      ? this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length 
      : this.currentFPS;
    const min = this.fpsHistory.length > 0 ? Math.min(...this.fpsHistory) : this.currentFPS;
    const max = this.fpsHistory.length > 0 ? Math.max(...this.fpsHistory) : this.currentFPS;
    
    return {
      current: this.currentFPS,
      average,
      min,
      max
    };
  }
  
  /**
   * Fallback GPU detection when WEBGL_debug_renderer_info is unavailable
   */
  private detectGPUFallback(): { vendor: string; renderer: string } {
    let vendor = 'Unknown';
    let renderer = 'Unknown';
    
    try {
      // Try to get some info from canvas fingerprinting
      if (this.gl) {
        const canvas = this.gl.canvas as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Use canvas capabilities as hints
          try {
            const maxTextureSize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);
            if (maxTextureSize >= 16384) {
              renderer += ' (High-end)';
            } else if (maxTextureSize >= 8192) {
              renderer += ' (Mid-range)';
            } else {
              renderer += ' (Low-end)';
            }
          } catch (paramError) {
            // Ignore parameter errors in fallback detection
          }
        }
      }
      
      // Parse user agent for GPU hints
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('intel')) {
        vendor = 'Intel';
        renderer = 'Intel GPU' + (renderer.includes('(') ? ' ' + renderer.match(/\([^)]+\)/)?.[0] : '');
      } else if (userAgent.includes('nvidia') || userAgent.includes('geforce')) {
        vendor = 'NVIDIA';
        renderer = 'NVIDIA GPU' + (renderer.includes('(') ? ' ' + renderer.match(/\([^)]+\)/)?.[0] : '');
      } else if (userAgent.includes('amd') || userAgent.includes('radeon')) {
        vendor = 'AMD';
        renderer = 'AMD GPU' + (renderer.includes('(') ? ' ' + renderer.match(/\([^)]+\)/)?.[0] : '');
      } else {
        // Try to infer from platform
        if (userAgent.includes('mobile') || userAgent.includes('android')) {
          renderer = 'Mobile GPU' + (renderer.includes('(') ? ' ' + renderer.match(/\([^)]+\)/)?.[0] : '');
        }
      }
    } catch (error) {
      console.warn('⚠️ Fallback GPU detection failed:', typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : error);
    }
    
    return { vendor, renderer };
  }
  
  /**
   * Handle WebGL context loss
   */
  private handleContextLoss(): void {
    console.error('🚨 WebGL Context Loss Detected!');
    console.error('🔄 Attempting context recovery...');
    
    // Reset memory info to safe defaults
    this.memoryInfo = {
      totalJSHeapSize: 0,
      usedJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      webglVendor: 'Context Lost',
      webglRenderer: 'Context Lost',
      maxTextureSize: 1024, // Very conservative
      maxRenderbufferSize: 1024,
      maxVertexTextureImageUnits: 4,
      maxFragmentUniformVectors: 128,
      memoryPressureLevel: 'critical', // Force conservative behavior
      currentFPS: 0,
      averageFPS: 0,
      minFPS: 0,
      maxFPS: 0,
      performanceLevel: 'poor'
    };
    
    // Dispatch custom event for application to handle context loss
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('webgl-context-lost', {
        detail: {
          timestamp: Date.now(),
          memoryMonitor: this
        }
      }));
    }
  }
  
  /**
   * Set up WebGL context loss listeners
   */
  setupContextLossListeners(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('webglcontextlost', (event) => {
      console.error('🚨 WebGL context lost event fired');
      event.preventDefault(); // Prevent default context loss behavior
      this.handleContextLoss();
    });
    
    canvas.addEventListener('webglcontextrestored', (_event) => {
      console.log('✅ WebGL context restored');
      // Reinitialize the monitor
      if (this.gl) {
        this.initialize(this.gl);
      }
    });
  }
  
  /**
   * Log memory and performance warnings if needed
   */
  logMemoryWarningIfNeeded(): void {
    const status = this.getMemoryStatus();
    if (!status) return;
    
    if (status.memoryPressureLevel === 'high' || status.memoryPressureLevel === 'critical') {
      console.warn('⚠️ GPU Memory Warning:', {
        level: status.memoryPressureLevel,
        jsHeapUsage: `${(status.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB / ${(status.jsHeapSizeLimit / 1024 / 1024).toFixed(1)}MB`,
        fps: `${status.currentFPS.toFixed(1)} FPS (avg: ${status.averageFPS.toFixed(1)})`,
        performance: status.performanceLevel,
        recommendation: 'Consider reducing scene complexity or using progressive loading'
      });
    }
    
    if (status.performanceLevel === 'poor' || status.performanceLevel === 'fair') {
      console.warn('⚠️ Performance Warning:', {
        currentFPS: status.currentFPS.toFixed(1),
        averageFPS: status.averageFPS.toFixed(1),
        minFPS: status.minFPS.toFixed(1),
        level: status.performanceLevel,
        recommendation: status.performanceLevel === 'poor' 
          ? 'Severe performance issues - consider reducing instance count or model complexity'
          : 'Performance degradation detected - monitor for WebGL context loss risk'
      });
    }
  }
}

// Export singleton instance
export const gpuMemoryMonitor = new GPUMemoryMonitor();

export default gpuMemoryMonitor;