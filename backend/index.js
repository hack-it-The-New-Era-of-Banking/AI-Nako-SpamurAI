require("dotenv").config({ path: '../.env' });
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { exec } = require("child_process");
const app = express();
const port = 3000;
const supabaseClient = require("../database/supabaseClient");

// Initialize Supabase Client

app.use(express.json());

// Configure CORS middleware to allow all origins (customize as needed)
app.use(
  cors({
    origin: "*", // Allow all origins. You can restrict to specific domains if needed.
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

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

    res.json(response.data);
  } catch (error) {
    axios.get("http://localhost:3000/run-script");
  }
});


// STEP 2
app.get("/run-script", (req, res) => {
  console.log("DEBUG: Received request to run script.");

  // Adjust the path and script name as needed
  exec("sh ./fetch_forensic_log.sh", (error, stdout, stderr) => {
    console.log("DEBUG: Script execution completed.");
    if (error) {
      console.error("DEBUG: Error executing script:", error);
      console.error("DEBUG: Stderr output:", stderr);
      return res.status(500).send(`Script error: ${stderr}`);
    }
    console.log("DEBUG: Script stdout output:", stdout);
    res.send(`Script output: ${stdout}`);
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
