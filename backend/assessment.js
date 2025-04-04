import { config } from "dotenv";
import { readFile } from "fs/promises";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';


config({ path: "../.env" });
const geminiAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function assessLogYara(yaraRuleFile, logFile) {
  try {
    // Read Yara and Log files
    const yaraRules = await readFile(yaraRuleFile, "utf-8");
    const logContents = await readFile(logFile, "utf-8");

    // prompt
    const prompt = `
    You are a security analyst. You are given:
    1. A set of YARA rules that describe malicious document behavior.
    2. A log file.
    
    Compare the log file to the YARA rules. Identify any matches or suspicious patterns. Explain any detections.
    Just provide your assessment in this format and nothing else:
    Confidence Level: {0-99%}
    Brief Explanation: 
    Decision: {Safe, Suspicious, Malicious}
    
    **YARA Rules:**
    ${yaraRules}
    
    **Log File:**
    ${logContents}
    `;

    // API time
    const model = geminiAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text;
  } catch (error) {
    console.error("Error: ", error);
  }
}

const folderPath = "./logs";

fs.readdir(folderPath, (err, logs) => {
  if (err) {
    console.error("Error: ", err);
    return;
  }
  const sortedLogs = logs.sort();
  const latestLog = sortedLogs[sortedLogs.length - 1];

  // test
  const yaraRules = "Maldoc_PDF.yar";
  assessLogYara(yaraRules, "logs/" + latestLog).then(console.log);
});

