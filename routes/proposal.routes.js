const express = require('express');
const router = express.Router();

const proposalController = require('../controllers/proposal.controllers');

router.post('/preview', (req, res, next) =>
  proposalController.preview(req, res, next)
);

router.post('/generate', (req, res, next) =>
  proposalController.generate(req, res, next)
);

module.exports = router;

/**
 * @swagger
 * /api/proposal/preview:
 *   post:
 *     summary: Pré-génération IA du contenu
 *     description: |
 *       Génère les sections de la proposition via DeepSeek.
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
 *     summary: Génération des documents finaux
 *     description: |
 *       Génère le document DOCX et PDF à partir des données.
 *       Si les sections IA sont fournies (après preview), pas de nouvel appel IA.
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
 *         description: Documents générés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenerateResponse'
 *       400:
 *         description: Erreur de validation
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */