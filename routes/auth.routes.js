const express = require("express");
const bcrypt = require("bcrypt");
const rateLimit = require("express-rate-limit");

const router = express.Router();

// Rate limiting - désactivé en développement pour les tests E2E
const isProduction = process.env.NODE_ENV === 'production';
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: isProduction ? 5 : 100, // 5 en prod, 100 en dev/test
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isProduction // Skip complètement en dev
});

// Liste des utilisateurs autorisés (chargés depuis .env)
const users = [
  { 
    username: process.env.ADMIN_USERNAME, 
    hash: process.env.ADMIN_PASSWORD_HASH, 
    role: "admin" 
  },
  { 
    username: process.env.MSI_USERNAME, 
    hash: process.env.MSI_PASSWORD_HASH, 
    role: "msi" 
  },
].filter(u => u.username && u.hash);

if (users.length === 0) {
  console.warn("⚠️  Aucun utilisateur configuré dans .env (voir .env.example)");
}

router.post("/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};

  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ success: false, error: "BAD_REQUEST" });
  }

  // Recherche de l'utilisateur (case-sensitive)
  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ success: false, error: "INVALID_CREDENTIALS" });
  }

  const okPass = await bcrypt.compare(password, user.hash);
  if (!okPass) {
    return res.status(401).json({ success: false, error: "INVALID_CREDENTIALS" });
  }

  // Regenerate = évite fixation de session
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ success: false, error: "SESSION_ERROR" });

    req.session.user = { username: user.username, role: user.role };
    return res.json({ success: true, user: req.session.user });
  });
});

router.get("/me", (req, res) => {
  if (!req.session?.user) return res.status(401).json({ success: false, error: "UNAUTHENTICATED" });
  return res.json({ success: true, user: req.session.user });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("msi.sid");
    res.json({ success: true });
  });
});

module.exports = router;

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Connexion utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Identifiants invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Récupérer l'utilisateur connecté
 *     tags: [Auth]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Utilisateur authentifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Non authentifié
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Déconnexion
 *     tags: [Auth]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 */

