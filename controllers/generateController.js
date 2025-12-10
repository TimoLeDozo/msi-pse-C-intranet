import { runDeepSeek } from "../ai/deepseekClient.js";
import { extractOCR } from "../ai/ocr.js";
import { generateDocument } from "../ai/templateEngine.js";
import { logCost } from "../utils/logger.js";

export async function generateController(req, res) {
  try {
    const form = req.body;

    // 1. Extract files → OCR
    const ocrText = await extractOCR(form.attachments || []);

    // 2. Build AI prompt
    const aiResponse = await runDeepSeek(form, ocrText);

    if (!aiResponse.success) {
      return res.status(500).json({ success: false, error: aiResponse.error });
    }

    // 3. Generate DOCX + PDF
    const files = await generateDocument(form, aiResponse.sections);

    // 4. Log cost + performance
    logCost(aiResponse);

    res.json({
      success: true,
      url: files.docx,
      pdfUrl: files.pdf,
      aiSections: aiResponse.sections,
      cost: aiResponse.cost,
      tokens: aiResponse.tokens
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.toString() });
  }
}
