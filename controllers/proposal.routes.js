/**
 * Proposal Routes
 */

const express = require('express');
const router = express.Router();
const proposalController = require('../controllers/proposal.controller');

// Preview IA (équivalent previewAIContent)
router.post('/preview', (req, res, next) =>
  proposalController.preview(req, res, next)
);

// Génération finale (DOCX + PDF)
router.post('/generate', (req, res, next) =>
  proposalController.generate(req, res, next)
);

module.exports = router;
