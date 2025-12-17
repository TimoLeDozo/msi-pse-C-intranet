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
