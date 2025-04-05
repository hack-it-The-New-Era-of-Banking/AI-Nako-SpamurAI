document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("checkButton")
    .addEventListener("click", checkEmlFile);
});

async function checkEmlFile() {
  const fileInput = document.getElementById("fileInput");
  const vtResult = document.getElementById("vtResult");
  const localResult = document.getElementById("localResult");
  const hashResult = document.getElementById("hashResult");

  vtResult.textContent = "🔄 Uploading and processing...";
  localResult.textContent = "⌛ Waiting for VirusTotal result...";
  hashResult.textContent = "";

  if (!fileInput.files.length) {
    vtResult.textContent = "❌ Please select a .eml file.";
    return;
  }

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append("eml", file);

  try {
    // 1. Upload the .eml file and extract PDFs
    const uploadResponse = await fetch("http://localhost:3000/upload-eml", {
      method: "POST",
      body: formData,
    });
    const uploadText = await uploadResponse.text();
    vtResult.textContent = `📥 ${uploadText}`;

    // 2. Compute hash
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    hashResult.textContent = `SHA-256 Hash: ${hashHex}`;

    // 3. Query VirusTotal
    const vtResponse = await fetch("http://localhost:3000/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hash: hashHex }),
    });
    const vtData = await vtResponse.json();

    if (vtData.data?.attributes?.last_analysis_stats) {
      const stats = vtData.data.attributes.last_analysis_stats;

      if (stats.malicious > 0) {
        vtResult.textContent = `❌ VirusTotal: Malicious content found!\n- Malicious: ${stats.malicious}`;
        localResult.textContent =
          "🛑 Gemini assessment skipped due to VirusTotal result.";
        return;
      } else {
        vtResult.textContent = `✅ VirusTotal: Clean.\n- Harmless: ${stats.harmless}`;
      }
    } else if (vtData.local?.log) {
      vtResult.textContent = "⚠️ VirusTotal failed. Using local scan only.";
    }

    // 4. Run Docker simulation (blocking)
    localResult.textContent = "🚦 Running local forensic simulation...";
    const runResponse = await fetch("http://localhost:3000/run-script");
    const runData = await runResponse.json();

    if (runResponse.status !== 200) {
      localResult.textContent = "❌ Docker run failed.";
      return;
    }

    // 5. Fetch Gemini AI assessment
    localResult.textContent = "🧠 Running AI assessment...";
    const aiResponse = await fetch("http://localhost:3000/assess");
    const aiData = await aiResponse.json();

    if (aiData.result) {
      const { confidenceLevel, explanation, decision } = aiData.result;
      localResult.textContent = `🔍 AI Assessment:\n- Confidence: ${confidenceLevel}%\n- Decision: ${decision}\n- Explanation: ${explanation}`;
    } else {
      localResult.textContent = "❌ Failed to generate AI assessment.";
    }
  } catch (err) {
    vtResult.textContent = "❌ Error during processing.";
    localResult.textContent = "";
    console.error(err);
  }
}
