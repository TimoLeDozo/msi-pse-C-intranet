require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");

const requireAuth = require("./middleware/requireAuth");
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

module.exports = app;
