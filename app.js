require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { generateFile } = require("./generateFile");
const { executeCode } = require("./execute");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 7000;
const PROBLEM_DATA_DIR = path.join(__dirname, "problem_data");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(cors());
app.use(express.json());

const normalize = (s) =>
  s.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n").map(l => l.trim()).join("\n");

// --------------------------------------------
// /api/run: Runs first 3 test cases + custom
// --------------------------------------------
app.post("/api/run", async (req, res) => {
  const { code, language, problemId, customInput } = req.body;
  const extMap = { cpp: "cpp", python: "py", java: "java" };

  if (!code || !language || !problemId || !extMap[language]) {
    return res.status(400).json({ error: "Invalid inputs" });
  }

  try {
    const ext = extMap[language];
    const filepath = generateFile(ext, code);
    const problemPath = path.join(PROBLEM_DATA_DIR, problemId);

    const inputPath = path.join(problemPath, "input.txt");
    const expectedPath = path.join(problemPath, "expected_output.txt");

    let testResults = [];

    if (fs.existsSync(inputPath) && fs.existsSync(expectedPath)) {
      const inputArr = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
      const expectedArr = JSON.parse(fs.readFileSync(expectedPath, "utf-8"));

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

// -------------------------------------------------
// /api/problems/:id/submit: Full test case check
// -------------------------------------------------
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
    const problemDir = path.join(PROBLEM_DATA_DIR, problemId);

    const inputFile = path.join(problemDir, "input.txt");
    const outputFile = path.join(problemDir, "expected_output.txt");

    if (!fs.existsSync(inputFile) || !fs.existsSync(outputFile)) {
      return res.status(400).json({ error: "Test case files missing." });
    }

    const inputs = JSON.parse(fs.readFileSync(inputFile, "utf-8"));
    const outputs = JSON.parse(fs.readFileSync(outputFile, "utf-8"));

    const testResults = [];

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const expected = outputs[i] || "";

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
      error: err.stderr || err.message || "Unknown compilation error",
      stderr: err.stderr || err.message || "Unknown compilation error",
      results: [],
    });
  }
});

// ------------------------------------
// /api/ai-help: Gemini Flash support
// ------------------------------------
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
