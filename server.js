import express from "express";
import dotenv from "dotenv";
import path from "path";
import generateRoute from "./routes/generate.js";

dotenv.config();
const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve frontend
app.use(express.static("public"));

// API routes
app.use("/api/generate", generateRoute);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running`);
  console.log(`Local:   http://localhost:${PORT}`);
});
