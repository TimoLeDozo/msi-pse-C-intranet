import axios from "axios";

export async function runDeepSeek(form, ocrText) {
  try {
    const systemPrompt = `
      Tu es consultant expert ICAM. Rédige une proposition commerciale structurée.
      Format JSON:
      {
        "titre": "",
        "contexte": "",
        "demarche": "",
        "phases": "",
        "phrase": ""
      }
    `;

    const userPrompt = `
CLIENT: ${form.entrepriseNom}
PROBLEME: ${form.ia_probleme}
SOLUTION: ${form.ia_solution}
OBJECTIFS: ${form.ia_objectifs}

DOCUMENTS OCR:
${ocrText}
    `;

    const response = await axios.post(
      "https://api.deepseek.com/v1/chat/completions",
      {
        model: "deepseek-reasoner",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.6,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const raw = response.data.choices[0].message.content;
    const sections = JSON.parse(raw);

    return {
      success: true,
      sections,
      cost: { totalUsd: 0.02 },
      tokens: response.data.usage
    };

  } catch (err) {
    return { success: false, error: err.toString() };
  }
}
