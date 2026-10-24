/**
 * Image compression and base64 optimization utility for legal documents.
 * Scales oversized scans/camera photos down to max 1600px preserving sharp Persian OCR text
 * while reducing payload size from 15MB+ to ~300KB to guarantee error-free HTTP transmission.
 */

export async function processFileForUpload(file: File): Promise<{
  base64: string;
  mimeType: string;
  originalSize: number;
  compressedSize: number;
}> {
  const mimeType = file.type || 'image/jpeg';
  const originalSize = file.size;

  // For non-images (PDF, text, etc.), read directly as base64
  if (!mimeType.startsWith('image/')) {
    const rawBase64 = await readFileAsBase64(file);
    return {
      base64: rawBase64,
      mimeType,
      originalSize,
      compressedSize: originalSize,
    };
  }

  // For images, downscale using HTML Canvas
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        readFileAsBase64(file).then((b64) =>
          resolve({
            base64: b64,
            mimeType,
            originalSize,
            compressedSize: originalSize,
          })
        );
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const MAX_DIMENSION = 1600;
          let width = img.width;
          let height = img.height;

          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            if (width > height) {
              height = Math.round((height * MAX_DIMENSION) / width);
              width = MAX_DIMENSION;
            } else {
              width = Math.round((width * MAX_DIMENSION) / height);
              height = MAX_DIMENSION;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            // Fallback
            const raw = dataUrl.split(',')[1] || '';
            resolve({
              base64: raw,
              mimeType,
              originalSize,
              compressedSize: originalSize,
            });
            return;
          }

          // Enable high-quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Export as JPEG with 0.82 quality
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          const base64 = optimizedDataUrl.split(',')[1] || '';
          const estimatedSize = Math.round((base64.length * 3) / 4);

          resolve({
            base64,
            mimeType: 'image/jpeg',
            originalSize,
            compressedSize: estimatedSize,
          });
        } catch {
          // If canvas fails, fallback to raw
          const raw = dataUrl.split(',')[1] || '';
          resolve({
            base64: raw,
            mimeType,
            originalSize,
            compressedSize: originalSize,
          });
        }
      };

      img.onerror = () => {
        readFileAsBase64(file).then((b64) =>
          resolve({
            base64: b64,
            mimeType,
            originalSize,
            compressedSize: originalSize,
          })
        );
      };

      img.src = dataUrl;
    };

    reader.onerror = () => {
      resolve({
        base64: '',
        mimeType,
        originalSize,
        compressedSize: 0,
      });
    };

    reader.readAsDataURL(file);
  });
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      resolve(res.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
