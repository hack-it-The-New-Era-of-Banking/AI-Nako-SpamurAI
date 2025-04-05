const path = require("path");
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { exec } = require("child_process");
const app = express();
const port = 3000;
const multer = require("multer");
const fs = require("fs");
const { simpleParser } = require("mailparser");

// Initialize Supabase Client

app.use(express.json());

const upload = multer({ dest: "docs/" });

// Configure CORS middleware to allow all origins (customize as needed)
app.use(
  cors({
    origin: "*", // Allow all origins. You can restrict to specific domains if needed.
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Load environment variables from .env file
require("dotenv").config({ path: "../.env" });
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const VIRUSTOTAL_KEY = process.env.VIRUSTOTAL_KEY;

// STEP 1
app.post("/scan", async (req, res) => {
  const { hash } = req.body;
  if (!hash) {
    return res.status(400).send("No hash provided");
  }

  try {
    const url = `https://www.virustotal.com/api/v3/files/${hash}`;
    const response = await axios.get(url, {
      headers: { "x-apikey": VIRUSTOTAL_KEY },
    });

    return res.json(response.data); // ✅ Return VT result
  } catch (error) {
    console.warn("❌ VirusTotal lookup failed, triggering local scan...");

    // Trigger your Docker container locally
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
    fs.unlinkSync(emlPath); // delete temp upload
  }
});

app.get("/run-script", (req, res) => {
  console.log("🟢 Received request to run Docker forensic simulation.");

  // Docker command to run forensic analysis container
  const dockerCommand = `docker run --rm \
    -v ${path.resolve(__dirname, "docs")}:/docs \
    -v ${path.resolve(__dirname, "logs")}:/logs \
    forensic-sim`;

  exec(dockerCommand, (error, stdout, stderr) => {
    console.log("📦 Docker run completed.");

    if (error) {
      console.error("❌ Docker execution failed:", error);
      console.error("stderr:", stderr);
      return res.status(500).json({
        message: "Docker container run failed.",
        error: stderr || error.message,
      });
    }

    const logPath = path.join(__dirname, "logs", "forensic.log");

    if (!fs.existsSync(logPath)) {
      return res.status(404).json({
        message: "❌ Log file not found after Docker execution.",
      });
    }

    const logContent = fs.readFileSync(logPath, "utf-8");

    res.json({
      message: "✅ Forensic analysis complete.",
      dockerOutput: stdout,
      log: logContent,
    });
  });
});

// Request to fetch forensic PDFs
app.get("/fetch-forensic-pdfs", (req, res) => {
  console.log("DEBUG: Received request to fetch forensic PDFs.");
  // Add your logic to fetch forensic PDFs here
  res.send("Fetching forensic PDFs...");
});

app.listen(port, () => {
  console.log(`DEBUG: Server is listening on port ${port}`);
});
