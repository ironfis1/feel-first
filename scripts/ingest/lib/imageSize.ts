// Reads pixel size from the first bytes of a JPEG or PNG, so the 1,200px rule (D-002)
// can be checked without downloading whole full-size files.

export interface Size {
  width: number;
  height: number;
}

/** Pixel size of a JPEG or PNG from its leading bytes, or null if it cannot be read from them. */
export function imageSize(bytes: Uint8Array): Size | null {
  if (isPng(bytes)) return pngSize(bytes);
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return jpegSize(bytes);
  return null;
}

function isPng(b: Uint8Array): boolean {
  return b.length >= 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
}

function pngSize(b: Uint8Array): Size {
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

// Start-of-frame markers carry the size. C4 (huffman table), C8 (reserved) and CC (arithmetic) are not frames.
const isStartOfFrame = (marker: number) =>
  marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

function jpegSize(b: Uint8Array): Size | null {
  let i = 2;
  // A frame header needs 9 bytes from its marker: FF, marker, length (2), precision, height (2), width (2).
  while (i + 8 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    if (marker === 0xff) {
      i += 1; // fill byte
      continue;
    }
    const length = (b[i + 2] << 8) | b[i + 3];
    if (isStartOfFrame(marker)) {
      return { height: (b[i + 5] << 8) | b[i + 6], width: (b[i + 7] << 8) | b[i + 8] };
    }
    i += 2 + length;
  }
  return null;
}
