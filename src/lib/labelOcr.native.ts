// Reads the text on a photo of a nutrition label in the Android and iOS app, with Google ML Kit running on the
// phone itself (the photo is not uploaded). The web uses labelOcr.ts instead (tesseract.js).
import TextRecognition from '@react-native-ml-kit/text-recognition';

/**
 * ML Kit hands back blocks, and a label's names and numbers usually land in different blocks (a column of names, a
 * column of numbers). The parser needs each row on one line, so lines that sit at the same height are joined, left
 * to right, using their boxes.
 */
export async function recognizeText(uri: string, _onProgress?: (text: string) => void): Promise<string> {
  const result = await TextRecognition.recognize(uri);
  const lines = result.blocks.flatMap((b) => b.lines).filter((l) => l.frame);
  if (lines.length === 0) return result.text;
  const sorted = [...lines].sort((a, b) => a.frame!.top - b.frame!.top);
  const rows: { mid: number; h: number; items: typeof lines }[] = [];
  for (const l of sorted) {
    const f = l.frame!;
    const mid = f.top + f.height / 2;
    const row = rows.find((r) => Math.abs(r.mid - mid) < Math.max(r.h, f.height) * 0.6);
    if (row) row.items.push(l);
    else rows.push({ mid, h: f.height, items: [l] });
  }
  return rows
    .map((r) => r.items.sort((a, b) => a.frame!.left - b.frame!.left).map((l) => l.text).join('   '))
    .join('\n');
}
