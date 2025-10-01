import { toast } from 'react-toastify';

// Suppress noisy stack traces for storage fetch failures (MinIO/S3) when storage is intentionally offline
export function installGlobalErrorHandlers() {
  if (typeof window === 'undefined') return;

  const isStorageMessage = (msg: string | undefined) => {
    if (!msg) return false;
    return /public\/storage\/serve|minio|s3|ECONNREFUSED|ENOTFOUND/i.test(msg);
  };

  window.addEventListener('error', (ev: ErrorEvent) => {
    try {
      const msg = ev?.message || ev?.error?.message || '';
      if (isStorageMessage(msg)) {
        // Quietly warn and show a short toast. Avoid console.error stack traces.
        console.warn('Global handler: suppressed storage error:', msg);
        toast.warn('Some assets are unavailable (storage offline). Placeholders will be used.', { autoClose: 4000, toastId: 'storage-suppressed-error' });
        // Prevent default logging of uncaught error in some environments
        ev.preventDefault?.();
      }
    } catch (e) {
      // Ignore
    }
  });

  window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
    try {
      const reason = ev.reason;
      const msg = typeof reason === 'string' ? reason : (reason && reason.message) || '';
      if (isStorageMessage(msg)) {
        console.warn('Global handler: suppressed unhandledrejection for storage fetch:', msg);
        toast.warn('Some assets are unavailable (storage offline). Placeholders will be used.', { autoClose: 4000, toastId: 'storage-suppressed-unhandled' });
        // Prevent the rejection from being logged loudly by the browser
        ev.preventDefault?.();
      }
    } catch (e) {
      // Ignore
    }
  });

  // Monkey-patch fetch so that if a storage asset fetch fails (MinIO offline),
  // we return a minimal valid GLB ArrayBuffer response to keep GLTFLoader/useGLTF happy.
  const originalFetch: any = (window.fetch as any).bind(window);

  const createMinimalGLB = (): Uint8Array => {
    const jsonChunk = {
      asset: { version: '2.0', generator: 'Lumea Placeholder' },
      scene: 0,
      scenes: [{ nodes: [] }],
      nodes: [],
      meshes: [],
      buffers: [{ byteLength: 0 }],
      bufferViews: [],
      accessors: []
    };

    const jsonString = JSON.stringify(jsonChunk);
    const encoder = new TextEncoder();
    const jsonBytes = encoder.encode(jsonString);
    const jsonChunkLength = jsonBytes.length;
    const binChunkLength = 0;

    // Header (12 bytes for magic/version/length plus we'll include chunk headers as needed)
    const header = new ArrayBuffer(12);
    const headerView = new DataView(header);
    headerView.setUint32(0, 0x46546C67, true); // 'glTF'
    headerView.setUint32(4, 2, true); // version
    const totalLength = 12 + 8 + jsonChunkLength + 8 + binChunkLength;
    headerView.setUint32(8, totalLength, true);

    // JSON chunk header
    const jsonChunkHeader = new ArrayBuffer(8);
    const jsonHeaderView = new DataView(jsonChunkHeader);
    jsonHeaderView.setUint32(0, jsonChunkLength, true);
    jsonHeaderView.setUint32(4, 0x4E4F534A, true); // 'JSON'

    // BIN chunk header
    const binChunkHeader = new ArrayBuffer(8);
    const binHeaderView = new DataView(binChunkHeader);
    binHeaderView.setUint32(0, binChunkLength, true);
    binHeaderView.setUint32(4, 0x004E4942, true); // 'BIN\0'

    const buffer = new Uint8Array(totalLength);
    let offset = 0;
    buffer.set(new Uint8Array(header), offset); offset += header.byteLength;
    buffer.set(new Uint8Array(jsonChunkHeader), offset); offset += jsonChunkHeader.byteLength;
    buffer.set(jsonBytes, offset); offset += jsonBytes.length;
    buffer.set(new Uint8Array(binChunkHeader), offset);

    return buffer;
  };

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === 'string' ? input : (input as Request | URL).toString();
    try {
      const resp = await originalFetch(input, init);
      // If the response is not ok (404/500) and it's a storage URL, return minimal GLB
      if (!resp.ok && /public\/storage\/serve/i.test(urlStr)) {
        const buf = createMinimalGLB();
  // Ensure we provide a plain ArrayBuffer to Blob to avoid SharedArrayBuffer typing issues
  const ab = buf.buffer.slice(0, buf.byteLength) as ArrayBuffer;
  const blob = new Blob([ab], { type: 'model/gltf-binary' });
        return new Response(blob, { status: 200, statusText: 'OK', headers: { 'Content-Type': 'model/gltf-binary' } });
      }
      return resp;
    } catch (err) {
      // Network error — if it's a storage asset, return minimal GLB so loaders don't crash
      if (/public\/storage\/serve|minio|s3|ECONNREFUSED|ENOTFOUND/i.test(urlStr)) {
        console.warn('Global fetch patch: storage fetch failed, returning minimal GLB for', urlStr);
        const buf = createMinimalGLB();
  const ab = buf.buffer.slice(0, buf.byteLength) as ArrayBuffer;
  const blob = new Blob([ab], { type: 'model/gltf-binary' });
        return new Response(blob, { status: 200, statusText: 'OK', headers: { 'Content-Type': 'model/gltf-binary' } });
      }
      throw err;
    }
  };
}

// Auto-install when imported
installGlobalErrorHandlers();
