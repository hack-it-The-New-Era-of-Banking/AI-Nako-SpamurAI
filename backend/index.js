import path from "path";
import express from "express";
import axios from "axios";
import cors from "cors";
import { exec } from "child_process";
import multer from "multer";
import fs from "fs";
import { simpleParser } from "mailparser";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { assessLogYara } from "./assessment.js";
import { createClient } from "@supabase/supabase-js";

// Simulate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: "../.env" });

// Init Express
const app = express();
const port = 3000;
const upload = multer({ dest: "docs/" });

// Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const VIRUSTOTAL_KEY = process.env.VIRUSTOTAL_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// --- Routes ---

// VirusTotal Hash Scan
app.post("/scan", async (req, res) => {
  const { hash } = req.body;
  if (!hash) return res.status(400).send("No hash provided");

  try {
    const response = await axios.get(
      `https://www.virustotal.com/api/v3/files/${hash}`,
      { headers: { "x-apikey": VIRUSTOTAL_KEY } }
    );
    return res.json(response.data);
  } catch (error) {
    console.warn("❌ VirusTotal failed. Running local Docker scan...");
    try {
      const localScanResponse = await axios.get(
        "http://localhost:3000/run-script"
      );
      return res.json({
        message: "Fallback to local Docker forensic scan.",
        local: localScanResponse.data,
      });
    } catch (fallbackError) {
      return res.status(500).json({
        error: "Both VirusTotal and local scan failed.",
        details: fallbackError.message,
      });
    }
  }
});

// Gemini AI Assessment
app.get("/assess", async (req, res) => {
  try {
    const folderPath = path.resolve("logs");
    const yaraRulePath = path.resolve("./Maldoc_PDF.yar");
    const outputPath = path.resolve("assessment_output.json");

    const logs = fs
      .readdirSync(folderPath)
      .filter((file) => file.endsWith(".log"))
      .sort();

    if (!logs.length)
      return res.status(404).json({ error: "No log files found." });

    const latestLog = path.join(folderPath, logs[logs.length - 1]);
    const result = await assessLogYara(yaraRulePath, latestLog, outputPath);

    res.json({
      message: "✅ Gemini assessment completed.",
      latestLog: path.basename(latestLog),
      result,
    });
  } catch (err) {
    console.error("❌ Gemini assessment error:", err);
    res.status(500).json({
      error: "Gemini assessment failed.",
      details: err.message,
    });
  }
});

// Upload .eml + extract PDFs
app.post("/upload-eml", upload.single("eml"), async (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded.");

  const emlPath = req.file.path;
  const outputDir = path.resolve(__dirname, "docs");

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  try {
    const emlContent = fs.readFileSync(emlPath);
    const parsed = await simpleParser(emlContent);

    const pdfAttachments = parsed.attachments.filter(
      (a) => a.contentType === "application/pdf"
    );

    if (pdfAttachments.length === 0) {
      return res
        .status(404)
        .send("❌ No PDF attachments found in the .eml file.");
    }

    const savedPaths = [];

    pdfAttachments.forEach((pdf, index) => {
      const filename = pdf.filename || `attachment-${index}.pdf`;
      const savePath = path.join(outputDir, filename);
      fs.writeFileSync(savePath, pdf.content);
      savedPaths.push(filename);
    });

    res.send(`✅ Saved PDF attachment(s): ${savedPaths.join(", ")}`);
  } catch (err) {
    console.error("❌ Error parsing .eml:", err);
    res.status(500).send("❌ Failed to extract PDF from .eml file.");
  } finally {
    fs.unlinkSync(emlPath);
  }
});

// Docker-based local forensic simulation
app.get("/run-script", (req, res) => {
  console.log("🟢 Running Docker forensic simulation...");

  const dockerCommand = `docker run --rm \
    -v ${path.resolve(__dirname, "docs")}:/docs \
    -v ${path.resolve(__dirname, "logs")}:/logs \
    forensic-sim`;

  exec(dockerCommand, (error, stdout, stderr) => {
    console.log("📦 Docker completed.");

    if (error) {
      console.error("❌ Docker error:", error);
      return res.status(500).json({
        message: "Docker container run failed.",
        error: stderr || error.message,
      });
    }

    const logPath = path.join(__dirname, "logs", "forensic.log");
    if (!fs.existsSync(logPath)) {
      return res.status(404).json({ message: "❌ Log file not found." });
    }

    const logContent = fs.readFileSync(logPath, "utf-8");

    res.json({
      message: "✅ Forensic analysis complete.",
      dockerOutput: stdout,
      log: logContent,
    });
  });
});

// Dev test
app.get("/fetch-forensic-pdfs", (req, res) => {
  console.log("📥 Received request to fetch forensic PDFs.");
  res.send("Fetching forensic PDFs...");
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
});
