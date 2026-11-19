// Payment screenshots, shrunk on the client's own device before they're sent: a phone screenshot (0.5–2 MB) becomes a
// JPEG of about 100 KB at most 1080 px wide, which keeps a receipt's text readable and Control's free storage small.

/** Control refuses anything larger (src/licensing/proofs.ts PROOF_MAX_BYTES is 400 KB); aim well under it. */
const TARGET_BYTES = 250 * 1024;

const toBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

/** The picture as a small JPEG, or an error in plain words (not a picture, or one this browser can't open). */
export async function shrinkScreenshot(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Choose a picture: a screenshot of the receipt.');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That picture can't be opened here. Take a screenshot of the receipt and choose that.");
  }
  try {
    for (const [width, quality] of [[1080, 0.75], [900, 0.65], [720, 0.55]] as const) {
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
      if (blob && blob.size <= TARGET_BYTES) return blob;
      if (blob && width === 720) return blob; // a very long screenshot: still far under Control's limit
    }
  } finally {
    bitmap.close();
  }
  throw new Error("That picture can't be made small enough. Take a screenshot of just the receipt.");
}
