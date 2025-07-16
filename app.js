require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { generateFile } = require("./generateFile");
const { executeCode } = require("./execute");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");
const Grid = require("gridfs-stream");

const app = express();
const PORT = process.env.PORT || 7000;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

let gfs;
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const conn = mongoose.connection;
conn.once("open", () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("problem_data");
  console.log("✅ MongoDB GridFS initialized");
});

app.use(cors());
app.use(express.json());

const normalize = (s) =>
  s.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n").map(l => l.trim()).join("\n");

const getFileText = (filename) =>
  new Promise((resolve, reject) => {
    let data = "";
    const readstream = gfs.createReadStream({ filename });
    readstream.on("data", (chunk) => (data += chunk));
    readstream.on("end", () => resolve(data));
    readstream.on("error", reject);
  });

// ---------------- /api/run ----------------
app.post("/api/run", async (req, res) => {
  const { code, language, problemId, customInput } = req.body;
  const extMap = { cpp: "cpp", python: "py", java: "java" };

  if (!code || !language || !problemId || !extMap[language]) {
    return res.status(400).json({ error: "Invalid inputs" });
  }

  try {
    const ext = extMap[language];
    const filepath = generateFile(ext, code);

    const inputRaw = await getFileText(`${problemId}_input.txt`);
    const outputRaw = await getFileText(`${problemId}_expected_output.txt`);
    const inputArr = JSON.parse(inputRaw);
    const expectedArr = JSON.parse(outputRaw);

    const testResults = [];

    for (let i = 0; i < Math.min(3, inputArr.length); i++) {
      const input = inputArr[i];
      const expected = expectedArr[i] || "";
      const { output = "", stderr = "" } = await executeCode({ language, filepath, input });

      if (stderr) {
        return res.status(200).json({
          error: stderr,
          stderr,
          testResults: [],
        });
      }

      testResults.push({
        testCase: i + 1,
        actualOutput: normalize(output),
        expectedOutput: normalize(expected),
        passed: normalize(output) === normalize(expected),
      });
    }

    let customResult = null;
    if (customInput && customInput.trim()) {
      const { output, stderr } = await executeCode({ language, filepath, input: customInput });
      customResult = { input: customInput, output, stderr };
    }

    res.status(200).json({ testResults, customResult });
  } catch (err) {
    console.error("🔥 Run Error:", err);
    res.status(200).json({
      error: err.stderr || err.message || "Unknown compilation error",
      stderr: err.stderr || err.message || "Unknown compilation error",
      testResults: [],
    });
  }
});

// ---------------- /api/problems/:id/submit ----------------
app.post("/api/problems/:id/submit", async (req, res) => {
  const { code, language } = req.body;
  const problemId = req.params.id;
  const extMap = { cpp: "cpp", python: "py", java: "java" };

  if (!code || !language || !extMap[language]) {
    return res.status(400).json({ error: "Invalid language or missing code." });
  }

  try {
    const ext = extMap[language];
    const filepath = generateFile(ext, code);

    const inputRaw = await getFileText(`${problemId}_input.txt`);
    const outputRaw = await getFileText(`${problemId}_expected_output.txt`);
    const inputArr = JSON.parse(inputRaw);
    const expectedArr = JSON.parse(outputRaw);

    const testResults = [];

    for (let i = 0; i < inputArr.length; i++) {
      const input = inputArr[i];
      const expected = expectedArr[i] || "";
      const { output = "", stderr = "" } = await executeCode({ language, filepath, input });

      if (stderr) {
        return res.status(200).json({
          status: "error",
          error: stderr,
          stderr,
          results: [],
        });
      }

      testResults.push({
        testCase: `tc${i + 1}`,
        actualOutput: normalize(output),
        expectedOutput: normalize(expected),
        passed: normalize(output) === normalize(expected),
      });
    }

    const allPassed = testResults.every(t => t.passed);
    res.status(200).json({
      status: allPassed ? "pass" : "fail",
      results: testResults,
    });
  } catch (err) {
    console.error("🔥 Submission Error:", err);
    res.status(200).json({
      status: "error",
      error: err.stderr || err.message || "Unknown error",
      stderr: err.stderr || err.message || "Unknown error",
      results: [],
    });
  }
});

// ---------------- /api/ai-help ----------------
app.post("/api/ai-help", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ answer: text });
  } catch (err) {
    console.error("🔥 Gemini Error:", err);
    res.status(500).json({ error: "Gemini failed to generate a response" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Compiler server listening on port ${PORT}`);
});
