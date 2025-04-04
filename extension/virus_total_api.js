require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const API_KEY = process.env.VIRUSTOTAL_KEY;

app.post("/scan", async (req, res) => {
    const { hash } = req.body;
    if (!hash) {
        return res.status(400).send("No hash provided");
    }

    try {
        const url = `https://www.virustotal.com/api/v3/files/${hash}`;
        const response = await axios.get(url, {
            headers: { "x-apikey": API_KEY },
        });

        res.json(response.data);
    } catch (error) {
        res.status(404).send("The hash is not in VirusTotal database");
    }
});

app.listen(3000, () => console.log("Server running on port 3000"));