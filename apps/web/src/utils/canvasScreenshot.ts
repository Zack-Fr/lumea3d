/**
 * Utility functions for capturing canvas screenshots
 */

export interface CanvasScreenshotOptions {
  width?: number;
  height?: number;
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
}

/**
 * Capture screenshot from R3F canvas
 */
export const captureCanvasScreenshot = (
  canvas?: HTMLCanvasElement | null,
  options: CanvasScreenshotOptions = {}
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Find the canvas if not provided
      let targetCanvas = canvas;
      if (!targetCanvas) {
        // Look for R3F canvas in the viewport - try different selectors
        targetCanvas = document.querySelector('canvas[data-engine="three.js r.*"]') as HTMLCanvasElement ||
                      document.querySelector('canvas') as HTMLCanvasElement;
      }

      if (!targetCanvas) {
        reject(new Error('Canvas not found'));
        return;
      }

      console.log('📸 Found canvas:', targetCanvas.width, 'x', targetCanvas.height);

      // Check for WebGL context loss
      const gl = targetCanvas.getContext('webgl') || targetCanvas.getContext('webgl2');
      if (gl && gl.isContextLost && gl.isContextLost()) {
        reject(new Error('WebGL context is lost'));
        return;
      }

      const {
        width = 400,
        height = 300,
        format = 'jpeg',
        quality = 0.8
      } = options;

      // Wait for next animation frame to ensure canvas is fully rendered
      requestAnimationFrame(() => {
        try {
          // Try to capture directly first (for WebGL canvases)
          let base64Data: string;
          
          try {
            const mimeType = `image/${format}`;
            base64Data = targetCanvas.toDataURL(mimeType, quality);
            
            // Check if the image is valid (not all black/transparent)
            if (base64Data === 'data:,' || base64Data.length < 100) {
              throw new Error('Canvas appears to be empty or invalid');
            }
            
            console.log('📸 Direct canvas capture successful, size:', base64Data.length);
            resolve(base64Data);
          } catch (directCaptureError) {
            console.warn('📸 Direct capture failed, trying with intermediate canvas:', directCaptureError);
            
            // Fallback: use intermediate canvas
            const tempCanvas = document.createElement('canvas');
            const ctx = tempCanvas.getContext('2d');

            if (!ctx) {
              reject(new Error('Failed to create canvas context'));
              return;
            }

            tempCanvas.width = width;
            tempCanvas.height = height;

            // Set background color to avoid transparency issues
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);

            // Draw the original canvas to the temp canvas (resized)
            ctx.drawImage(targetCanvas, 0, 0, width, height);

            // Convert to base64
            const mimeType = `image/${format}`;
            base64Data = tempCanvas.toDataURL(mimeType, quality);
            
            console.log('📸 Intermediate canvas capture successful, size:', base64Data.length);
            resolve(base64Data);
          }
        } catch (error) {
          console.error('📸 Canvas capture failed:', error);
          reject(error);
        }
      });
    } catch (error) {
      console.error('📸 Canvas screenshot setup failed:', error);
      reject(error);
    }
  });
};

/**
 * Upload screenshot as project thumbnail
 */
export const uploadCanvasScreenshot = async (
  projectId: string,
  screenshotData: string,
  type: 'auto' | 'custom' = 'auto'
): Promise<{ thumbnailUrl: string }> => {
  const base = import.meta?.env?.VITE_API_URL || 'http://192.168.1.10:3000';
  const response = await fetch(`${base}/projects/${projectId}/thumbnail`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('access_token') || ''}`,
    },
    body: JSON.stringify({
      imageData: screenshotData,
      type,
      originalFilename: `canvas-screenshot-${Date.now()}.jpg`,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload thumbnail: ${response.status} ${error}`);
  }

  return await response.json();
};

/**
 * Capture and upload canvas screenshot in one step
 */
export const captureAndUploadScreenshot = async (
  projectId: string,
  canvas?: HTMLCanvasElement | null,
  options: CanvasScreenshotOptions = {}
): Promise<{ thumbnailUrl: string }> => {
  const screenshotData = await captureCanvasScreenshot(canvas, options);
  return await uploadCanvasScreenshot(projectId, screenshotData, 'auto');
};