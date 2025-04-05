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
    // Upload EML file and extract PDF
    const uploadResponse = await fetch("http://localhost:3000/upload-eml", {
      method: "POST",
      body: formData,
    });

    const uploadText = await uploadResponse.text();
    vtResult.textContent = `📥 ${uploadText}`;

    // Assume the extracted PDF is the first in /docs folder
    const pdfFilePath = `docs/${file.name.replace(".eml", ".pdf")}`;
    const pdfFile = fileInput.files[0]; // still use this file for hash

    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    hashResult.textContent = `SHA-256 Hash: ${hashHex}`;

    // Step 2: Send hash to VirusTotal
    const vtResponse = await fetch("http://localhost:3000/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hash: hashHex }),
    });

    const data = await vtResponse.json();

    // Step 3: Check VirusTotal response
    if (data.data?.attributes?.last_analysis_stats) {
      const stats = data.data.attributes.last_analysis_stats;

      if (stats.malicious > 0) {
        vtResult.textContent = `❌ VirusTotal: Malicious content found!\n- Malicious: ${stats.malicious}`;
        localResult.textContent =
          "🛑 Local scan skipped due to VirusTotal result.";
      } else {
        vtResult.textContent = `✅ VirusTotal: Clean.\n- Harmless: ${stats.harmless}`;
        // Step 4: Trigger local scan
        const localScan = await fetch("http://localhost:3000/run-script");
        const localData = await localScan.json();
        localResult.textContent = localData.log || localData.message;
      }
    } else if (data.local?.log) {
      vtResult.textContent = "⚠️ VirusTotal failed. Using local scan only.";
      localResult.textContent = data.local.log;
    } else {
      vtResult.textContent = "❌ Unexpected VirusTotal response.";
    }
  } catch (err) {
    vtResult.textContent = "❌ Error processing file.";
    localResult.textContent = "";
    console.error(err);
  }
}
