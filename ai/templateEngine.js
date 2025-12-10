import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { PDFDocument } from "pdf-lib";

export async function generateDocument(form, aiSections) {
  const templatePath = path.join("templates", "base.docx");
  const template = fs.readFileSync(templatePath);

  const zip = new PizZip(template);
  const doc = new Docxtemplater(zip, { paragraphLoop: true });

  const data = { ...form, ...aiSections };

  doc.render(data);

  const buffer = doc.getZip().generate({ type: "nodebuffer" });

  const outDir = "output/generated";
  const filename = `Propale_${form.entrepriseNom}_${Date.now()}`;

  fs.writeFileSync(`${outDir}/${filename}.docx`, buffer);

  // PDF conversion (simple: wrap DOCX as PDF)
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  page.drawText("PDF Export - See DOCX");
  
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(`${outDir}/${filename}.pdf`, pdfBytes);

  return {
    docx: `/output/generated/${filename}.docx`,
    pdf: `/output/generated/${filename}.pdf`
  };
}
