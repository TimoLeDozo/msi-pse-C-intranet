/**
 * Use case: generate proposal
 * Rôle : draft → documents (docx/pdf)
 * NOTE: stub volontaire pour stabiliser l'exécution. On branchera la vraie génération ensuite.
 */

module.exports = {
  async execute(proposalDraft) {
    return {
      success: true,
      documents: {
        docx: { url: '#' },
        pdf: { url: '#' }
      },
      note: 'Generation pipeline à implémenter (docx/pdf adapters)'
    };
  }
};
