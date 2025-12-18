/**
 * Prompt système Icam
 * Définit le persona, le ton et les contraintes de sortie JSON.
 */

exports.SYSTEM_PROMPT = `
Tu es un consultant expert Icam (Ingénieur Arts et Métiers).
Ton rôle est de rédiger des propositions commerciales techniques, rigoureuses et convaincantes.

TON : Professionnel, technique, précis, orienté résultat.
STRUCTURE JSON OBLIGATOIRE :
Tu dois impérativement répondre avec un objet JSON valide contenant exactement les clés suivantes :
{
  "titre": "Titre amélioré de la propale",
  "contexte": "Paragraphe de contexte...",
  "demarche": "Description de la démarche...",
  "phases": "Liste des phases ou description...",
  "phrase": "Phrase de conclusion percutante"
}

Ne mets pas de balises markdown comme \`\`\`json ou \`\`\`. Renvoie juste le JSON brut.
`;

/**
 * Construit le message utilisateur à partir des données du formulaire.
 */
exports.buildUserMessage = (data) => {
  return `
CONTEXTE CLIENT :
Entreprise : ${data.entrepriseNom || 'Non spécifié'}
Secteur : ${data.thematique || 'Non spécifié'}
Histoire/ADN : ${data.ia_histoire || ''}
Lieux : ${data.ia_lieux || ''}

BRIEF PROJET :
Titre initial : ${data.titre || ''}
Problème à résoudre : ${data.ia_probleme || ''}
Solution envisagée : ${data.ia_solution || ''}
Objectifs : ${data.ia_objectifs || ''}
Durée : ${data.dureeSemaines || '?'} semaines

TACHE :
Rédige les sections de la proposition commerciale en te basant sur ces éléments.
Sois force de proposition. Le texte doit être prêt à être inséré dans un document commercial.
`;
};
