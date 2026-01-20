const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const proposalController = require('../controllers/proposal.controllers');

// Rate limiting - desactive en developpement pour ne pas bloquer les tests
const isProduction = process.env.NODE_ENV === 'production';
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isProduction ? 20 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isProduction
});

router.post('/preview', aiLimiter, (req, res, next) =>
  proposalController.preview(req, res, next)
);

router.post('/generate', aiLimiter, (req, res, next) =>
  proposalController.generate(req, res, next)
);

module.exports = router;

/**
 * @swagger
 * /api/proposal/preview:
 *   post:
 *     summary: Pré-génération IA du contenu
 *     description: |
 *       Génère les sections de la proposition via Ollama (inférence locale).
 *       Permet à l'utilisateur de prévisualiser et éditer avant génération finale.
 *     tags: [Proposal]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProposalInput'
 *     responses:
 *       200:
 *         description: Contenu généré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PreviewResponse'
 *       400:
 *         description: Erreur de validation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */

/**
 * @swagger
 * /api/proposal/generate:
 *   post:
 *     summary: Generation du document PDF final
 *     description: |
 *       Genere le document PDF a partir des donnees via le pipeline HTML-to-PDF.
 *       Le document est archive dans out/{Nom_Client}/{Date_Projet}/.
 *       Si les sections IA sont fournies (apres preview), pas de nouvel appel IA.
 *       entrepriseNom est requis pour la generation et l'archivage.
 *     tags: [Proposal]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenerateInput'
 *     responses:
 *       200:
 *         description: Document PDF genere avec succes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenerateResponse'
 *       400:
 *         description: Erreur de validation (entrepriseNom requis)
 *       401:
 *         description: Non authentifie
 *       500:
 *         description: Erreur serveur
 */
