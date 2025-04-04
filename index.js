// index.js
const express = require("express");
const { exec } = require("child_process");
const app = express();
const port = 3000;

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

app.listen(port, () => {
  console.log(`DEBUG: Server is listening on port ${port}`);
});
