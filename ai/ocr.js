import Tesseract from "tesseract.js";
import { Buffer } from "node:buffer";

// ESM-compatible dynamic import for CommonJS pdf-parse
const pdfParse = (await import("pdf-parse")).default;

export async function extractOCR(files) {
  let output = [];

  for (const f of files) {
    const buffer = Buffer.from(f.bytes, "base64");

    // PDF
    if (f.mimeType.includes("pdf")) {
      const data = await pdfParse(buffer);
      output.push(data.text);
    }

    // IMAGES (png, jpeg…)
    else if (f.mimeType.includes("image")) {
      const result = await Tesseract.recognize(buffer, "eng");
      output.push(result.data.text);
    }
  }

  return output.join("\n").substring(0, 50000);
}
