document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("computeHashButton").addEventListener("click", computeHash);
});

async function computeHash() {
    const fileInput = document.getElementById('fileInput');
    const hashResult = document.getElementById('hashResult');

    if (!fileInput.files.length) {
        hashResult.textContent = "Please select a file.";
        return;
    }

    const file = fileInput.files[0];
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    hashResult.textContent = `SHA-256 Hash: ${hashHex}`;

    if (hashHex.length > 0) {
        sendToVirusTotal(hashHex);
    }
}

async function sendToVirusTotal(hash) {
    try {
        const response = await fetch("http://localhost:3000/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hash }),
        });

        const text = await response.text();
        document.getElementById("vtResult").textContent = text;
    } catch (error) {
        document.getElementById("vtResult").textContent = "Error scanning hash.";
    }
}