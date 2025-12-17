exports.preview = async (req, res, next) => {
  try {
    console.log('Preview request received:', req.body);
    // Mock response for preview
    const aiSections = {
      titre: req.body.titre || "Titre Généré",
      contexte: "Contexte généré par l'IA...",
      demarche: "Démarche générée par l'IA...",
      phases: "Phases générées par l'IA...",
      phrase: "Conclusion générée par l'IA..."
    };

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    res.json({
      success: true,
      aiSections: aiSections,
      cost: { totalUsd: 0.01 }
    });
  } catch (error) {
    next(error);
  }
};

exports.generate = async (req, res, next) => {
  try {
    console.log('Generate request received:', req.body);
    // Mock response for generate
    // In a real scenario, this would generate documents and return URLs.
    // We return dummy URLs.

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    res.json({
      success: true,
      documents: {
        docx: { url: "#" },
        pdf: { url: "#" }
      }
    });
  } catch (error) {
    next(error);
  }
};
