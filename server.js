require("dotenv").config();

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET manquant dans .env");
}

const path = require("path");
const express = require("express");
const session = require("express-session");

const requireAuth = require("./middleware/requireAuth");
const errorMiddleware = require("./middleware/error.middleware");
const authRoutes = require("./routes/auth.routes");
const proposalRoutes = require("./routes/proposal.routes");

const app = express();

app.use(express.json({ limit: "2mb" }));

app.use(session({
  name: "msi.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60 * 1000
  }
}));

// Public
app.use("/assets", express.static(path.join(__dirname, "public", "assets")));
app.use("/files", express.static(path.join(__dirname, "storage", "outputs")));
app.use("/auth", authRoutes);

app.get("/login", (req, res) => {
  if (req.session?.user) return res.redirect("/");
  res.sendFile(path.join(__dirname, "public", "login.html"));
});
app.get("/login.html", (req, res) => res.redirect("/login"));

// Protégé
app.get("/", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/index.html", requireAuth, (req, res) => res.redirect("/"));

// API protégée
app.use("/api/proposal", requireAuth, proposalRoutes);

// Middleware d'erreur (doit être en dernier)
app.use(errorMiddleware);

module.exports = app;

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));

// === SWAGGER ===
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger.config');

// Documentation API - accessible sans auth pour le jury
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MSI Propales API'
}));

// Endpoint JSON OpenAPI (pour Postman, etc.)
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

/**
 * @swagger
 * /files/{filename}:
 *   get:
 *     summary: Télécharger un document généré
 *     tags: [Files]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Nom du fichier (ex: propale_1704067200000.docx)
 *     responses:
 *       200:
 *         description: Fichier téléchargé
 *         content:
 *           application/vnd.openxmlformats-officedocument.wordprocessingml.document:
 *             schema:
 *               type: string
 *               format: binary
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Fichier non trouvé
 *       401:
 *         description: Non authentifié
 */

