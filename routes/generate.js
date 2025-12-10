import express from "express";
import { generateController } from "../controllers/generateController.js";

const router = express.Router();

router.post("/", generateController);

export default router;
