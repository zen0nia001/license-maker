// Pictures are made small on this device before they're sent, so Control's free storage stays small:
//   - a client's payment screenshot: a JPEG at most 1080 px wide, about 100–250 KB (Control: at most 400 KB);
//   - an app's preview image on the store: a JPEG at most 1600 px wide, about 150–500 KB (Control: at most 700 KB).

type Shrunk = { blob: Blob; width: number; height: number };

const toBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

/** Tries each (width, quality) in turn until the JPEG fits `target`; the last one is kept if it still fits `limit`. */
async function shrink(file: File, steps: readonly (readonly [number, number])[], target: number, limit: number, notAPicture: string): Promise<Shrunk> {
  if (!file.type.startsWith('image/')) throw new Error(notAPicture);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That picture can't be opened here. Take a screenshot and choose that.");
  }
  try {
    for (let i = 0; i < steps.length; i++) {
      const [width, quality] = steps[i]!;
      const scale = Math.min(1, width / bitmap.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const g = canvas.getContext('2d');
      if (!g) break;
      g.fillStyle = '#fff'; // a transparent PNG would turn black as a JPEG
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await toBlob(canvas, quality);
      if (!blob) break;
      const last = i === steps.length - 1;
      if (blob.size <= target || (last && blob.size <= limit)) return { blob, width: canvas.width, height: canvas.height };
    }
  } finally {
    bitmap.close();
  }
  throw new Error("That picture can't be made small enough. Crop it to what matters and try again.");
}

/** A client's receipt screenshot, as a small JPEG. */
export async function shrinkScreenshot(file: File): Promise<Blob> {
  const { blob } = await shrink(file, [[1080, 0.75], [900, 0.65], [720, 0.55]], 250 * 1024, 380 * 1024, 'Choose a picture: a screenshot of the receipt.');
  return blob;
}

/** An app's preview image for the store, as a JPEG with its size (for the store's layout). */
export const shrinkPreview = (file: File): Promise<Shrunk> =>
  shrink(file, [[1600, 0.82], [1440, 0.75], [1280, 0.7], [1024, 0.65]], 500 * 1024, 680 * 1024, 'Choose a picture: a screenshot of the app.');
