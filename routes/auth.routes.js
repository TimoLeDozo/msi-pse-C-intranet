const express = require("express");
const bcrypt = require("bcrypt");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false
});

function getAdminConfig() {
  const username = process.env.ADMIN_USERNAME;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!username || !passwordHash) {
    throw new Error("ADMIN_USERNAME / ADMIN_PASSWORD_HASH manquants (voir .env.example)");
  }
  return { username, passwordHash };
}

router.post("/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};

  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ success: false, error: "BAD_REQUEST" });
  }

  const admin = getAdminConfig();

  const okUser = username === admin.username;
  const okPass = okUser ? await bcrypt.compare(password, admin.passwordHash) : false;

  if (!okPass) {
    return res.status(401).json({ success: false, error: "INVALID_CREDENTIALS" });
  }

  // Regenerate = évite fixation de session
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ success: false, error: "SESSION_ERROR" });

    req.session.user = { username, role: "admin" };
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
