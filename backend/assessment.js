import { readFile, writeFile } from "fs/promises";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "dotenv";

config({ path: "../.env" });

const geminiAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function assessLogYara(yaraRuleFile, logFile, outputPath) {
  const yaraRules = await readFile(yaraRuleFile, "utf-8");

  // Read log and trim to last 200 lines to avoid token overflow
  const rawLog = await readFile(logFile, "utf-8");
  const trimmedLog = rawLog.trim().split("\n").slice(-200).join("\n");

  const prompt = `
You are a security analyst. You are given:
1. A set of YARA rules that describe malicious document behavior.
2. A log file (last 200 lines only due to length limits).

Compare the log file to the YARA rules. Identify any matches or suspicious patterns. Explain any detections.
Just provide your assessment in this format and nothing else:
Confidence Level: {0-99%}
Brief Explanation:
Decision: {Safe, Suspicious, Malicious}

**YARA Rules:**
${yaraRules}

**Log File (last 200 lines):**
${trimmedLog}
  `;

  const model = geminiAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  const match = text.match(
    /Confidence Level:\s*(\d+)%?\s*Brief Explanation:\s*(.*?)\s*Decision:\s*(Safe|Suspicious|Malicious)/is
  );

  const jsonOutput = match
    ? {
        confidenceLevel: parseInt(match[1]),
        explanation: match[2].trim(),
        decision: match[3],
      }
    : { raw: text };

  await writeFile(outputPath, JSON.stringify(jsonOutput, null, 2), "utf-8");
  return jsonOutput;
}
