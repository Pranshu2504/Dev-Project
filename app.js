require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { generateFile, cleanupFile } = require("./generateFile");
const { executeCode } = require("./execute");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 7000;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ Allowed frontend origin (Vercel URL)
const allowedOrigins = [
  "https://dev-project-aj2v4vtls-pranshu-goels-projects.vercel.app",
];

// ✅ CORS Setup for credentials
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Optional: handle preflight OPTIONS
app.options("*", cors());

app.use(express.json());

let gridfsBucket;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const conn = mongoose.connection;
conn.once("open", () => {
  try {
    gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
      bucketName: "problem_data",
    });
    console.log("✅ MongoDB GridFS initialized");
  } catch (error) {
    console.error("❌ GridFS initialization failed:", error);
  }
});

const normalize = (s) =>
  s.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n").map(l => l.trim()).join("\n");

const getFileText = (filename) =>
  new Promise((resolve, reject) => {
    if (!gridfsBucket) {
      return reject(new Error("GridFS not initialized"));
    }

    let data = "";
    const stream = gridfsBucket.openDownloadStreamByName(filename);

    stream.on("data", (chunk) => {
      data += chunk.toString();
    });

    stream.on("end", () => {
      resolve(data);
    });

    stream.on("error", (error) => {
      console.error(`❌ Error reading GridFS file ${filename}:`, error);
      reject(error);
    });
  });

// ---------------- /api/problems/:id/run ----------------
app.post("/api/problems/:id/run", async (req, res) => {
  const { code, language, customInput } = req.body;
  const problemId = req.params.id;
  const extMap = { cpp: "cpp", python: "py", java: "java" };

  if (!code || !language || !extMap[language]) {
    return res.status(400).json({ error: "Invalid inputs" });
  }

  let filepath;
  try {
    const ext = extMap[language];
    filepath = await generateFile(ext, code);

    if (!gridfsBucket) {
      return res.status(500).json({ 
        error: "Database not initialized",
        testResults: []
      });
    }

    const inputRaw = await getFileText(`${problemId}_input.txt`);
    const outputRaw = await getFileText(`${problemId}_expected_output.txt`);
    const inputArr = JSON.parse(inputRaw);
    const expectedArr = JSON.parse(outputRaw);

    const testResults = [];

    for (let i = 0; i < Math.min(3, inputArr.length); i++) {
      const input = inputArr[i];
      const expected = expectedArr[i] || "";

      const { output = "", stderr = "" } = await executeCode({
        language,
        filepath,
        input,
        gridfsBucket,
      });

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
      const { output, stderr } = await executeCode({
        language,
        filepath,
        input: customInput,
        gridfsBucket,
      });

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
  } finally {
    if (filepath) {
      cleanupFile(filepath);
    }
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

  let filepath;
  try {
    const ext = extMap[language];
    filepath = await generateFile(ext, code);

    if (!gridfsBucket) {
      return res.status(500).json({ 
        status: "error",
        error: "Database not initialized",
        testResults: []
      });
    }

    const inputRaw = await getFileText(`${problemId}_input.txt`);
    const outputRaw = await getFileText(`${problemId}_expected_output.txt`);
    const inputArr = JSON.parse(inputRaw);
    const expectedArr = JSON.parse(outputRaw);

    const testResults = [];

    for (let i = 0; i < inputArr.length; i++) {
      const input = inputArr[i];
      const expected = expectedArr[i] || "";

      const { output = "", stderr = "" } = await executeCode({
        language,
        filepath,
        input,
        gridfsBucket,
      });

      if (stderr) {
        return res.status(200).json({
          status: "error",
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

    const allPassed = testResults.every(t => t.passed);
    res.status(200).json({
      status: allPassed ? "pass" : "fail",
      testResults,
    });
  } catch (err) {
    console.error("🔥 Submission Error:", err);
    res.status(200).json({
      status: "error",
      error: err.stderr || err.message || "Unknown error",
      stderr: err.stderr || err.message || "Unknown error",
      testResults: [],
    });
  } finally {
    if (filepath) {
      cleanupFile(filepath);
    }
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

// Health check
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    gridfs: gridfsBucket ? "connected" : "not connected",
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`✅ Compiler server listening on port ${PORT}`);
});
