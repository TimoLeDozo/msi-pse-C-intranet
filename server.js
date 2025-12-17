require('dotenv').config();

const express = require('express');
const path = require('path');

const proposalRoutes = require('./routes/proposal.routes');
const errorMiddleware = require('./middleware/error.middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const server = app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down...');
  server.close(() => {
    console.log('✅ Server stopped cleanly');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down...');
  server.close(() => process.exit(0));
});

// Front
app.use(express.static(path.join(__dirname, 'public')));

// API
console.log('proposalRoutes type:', typeof proposalRoutes);
app.use('/api/proposal', proposalRoutes);

// Fichiers générés
app.use(
  '/files',
  express.static(path.join(__dirname, 'storage/outputs'), {
    index: false
  })
);

// ⚠️ DOIT ÊTRE UNE FONCTION
app.use(errorMiddleware);

