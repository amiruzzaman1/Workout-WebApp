// Reads the text on a photo of a nutrition label, on the web. tesseract.js runs in the browser (WebAssembly), so the
// photo never leaves the device; only the English language file (a few MB) is downloaded the first time and cached.
// The Android and iOS app use labelOcr.native.ts instead (Google ML Kit, on the phone).

/**
 * Sizes the photo for reading: the longest side goes to about 2400 px. A big phone photo is shrunk (much faster), and a
 * small picture is enlarged, because the reader drops decimal points and reads g as 9 when the text is tiny.
 */
async function fitForReading(uri: string, target = 2400): Promise<string> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = uri;
    });
    const scale = Math.min(3, target / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return uri;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/png');
  } catch {
    return uri;
  }
}

export async function recognizeText(uri: string, onProgress?: (text: string) => void): Promise<string> {
  const { createWorker, PSM } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (!onProgress) return;
      if (m.status === 'recognizing text') onProgress(`Reading the label ${Math.round(m.progress * 100)}%`);
      else if (/load|init/.test(m.status)) onProgress('Getting the reader ready (first time only)');
    },
  });
  try {
    // One block of text keeps each label row (name, per serving, per 100) on one line.
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK, preserve_interword_spaces: '1' });
    const { data } = await worker.recognize(await fitForReading(uri));
    return data.text;
  } finally {
    await worker.terminate();
  }
}
