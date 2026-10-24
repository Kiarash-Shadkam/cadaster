/**
 * Utility for optimizing images and documents before uploading to AI Studio dev backend.
 * Compresses multi-megabyte scanned photos to lightweight (<300KB) high-clarity images,
 * preventing browser "Failed to fetch" iframe payload limit drops and timeouts.
 */

export interface PreparedUploadData {
  base64?: string;
  rawText?: string;
  mimeType: string;
  originalSize: number;
  optimizedSize?: number;
}

export async function prepareFileForAnalysis(file: File): Promise<PreparedUploadData> {
  const mimeType = file.type || '';

  // 1. Image compression via Offscreen Canvas
  if (mimeType.startsWith('image/')) {
    try {
      const compressed = await compressImageFile(file, 1600, 0.82);
      return {
        base64: compressed.base64,
        mimeType: 'image/jpeg',
        originalSize: file.size,
        optimizedSize: compressed.size,
      };
    } catch (err) {
      console.warn('Canvas image compression failed, falling back to direct base64 read:', err);
      const directBase64 = await readFileAsBase64(file);
      return {
        base64: directBase64,
        mimeType: file.type || 'image/jpeg',
        originalSize: file.size,
      };
    }
  }

  // 2. Text / plain document
  if (mimeType.startsWith('text/') || file.name.endsWith('.txt')) {
    try {
      const text = await file.text();
      return {
        rawText: text,
        mimeType: 'text/plain',
        originalSize: file.size,
      };
    } catch (err) {
      console.warn('Reading text failed:', err);
    }
  }

  // 3. PDF or binary documents
  const base64 = await readFileAsBase64(file);
  return {
    base64,
    mimeType: file.type || 'application/pdf',
    originalSize: file.size,
  };
}

function compressImageFile(
  file: File,
  maxDimension: number = 1600,
  quality: number = 0.82
): Promise<{ base64: string; size: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Smooth resizing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64 = dataUrl.split(',')[1] || '';
      const approximateSize = Math.round((base64.length * 3) / 4);

      resolve({
        base64,
        size: approximateSize,
      });
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(objectUrl);
      reject(e);
    };

    img.src = objectUrl;
  });
}

function readFileAsBase64(file: File): Promise<string> {
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
