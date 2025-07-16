const fs = require("fs");
const path = require("path");
const axios = require("axios");
const Problem = require("../models/problems");

require("dotenv").config();

const PROBLEM_DATA_DIR = path.resolve(__dirname, "../problem_data");
const COMPILER_URL = process.env.COMPILER_URL || "http://localhost:7000";

// Create a new problem
exports.createProblem = async (req, res) => {
  try {
    const { title, description, difficulty, testCases } = req.body;

    if (!title || !description || !testCases?.length) {
      return res.status(400).json({ error: "Title, description, and test cases are required." });
    }

    const newProblem = new Problem({ title, description, difficulty });
    await newProblem.save();

    const problemDir = path.join(PROBLEM_DATA_DIR, newProblem._id.toString());
    if (!fs.existsSync(problemDir)) fs.mkdirSync(problemDir, { recursive: true });

    const inputLines = testCases.map(tc => tc.input.trim());
    const outputLines = testCases.map(tc => tc.expectedOutput.trim());

    fs.writeFileSync(path.join(problemDir, "input.txt"), JSON.stringify(inputLines, null, 2), "utf-8");
    fs.writeFileSync(path.join(problemDir, "expected_output.txt"), JSON.stringify(outputLines, null, 2), "utf-8");

    res.status(201).json({ message: "Problem created successfully", id: newProblem._id });
  } catch (err) {
    console.error("Error in createProblem:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get a problem
exports.getProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const problem = await Problem.findById(id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    const problemDir = path.join(PROBLEM_DATA_DIR, id);
    const inputPath = path.join(problemDir, "input.txt");
    const expectedPath = path.join(problemDir, "expected_output.txt");

    let testCases = [];
    if (fs.existsSync(inputPath) && fs.existsSync(expectedPath)) {
      const inputs = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
      const outputs = JSON.parse(fs.readFileSync(expectedPath, "utf-8"));
      testCases = inputs.map((input, i) => ({
        input,
        expectedOutput: outputs[i] || ""
      }));
    }

    res.json({ ...problem.toObject(), testCases });
  } catch (err) {
    console.error("Error in getProblem:", err);
    res.status(500).json({ error: err.message });
  }
};

// Edit a problem
exports.editProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, difficulty, testCases } = req.body;

    const updated = await Problem.findByIdAndUpdate(id, { title, description, difficulty }, { new: true });
    if (!updated) return res.status(404).json({ error: "Problem not found" });

    if (testCases?.length) {
      const problemDir = path.join(PROBLEM_DATA_DIR, id);
      if (!fs.existsSync(problemDir)) fs.mkdirSync(problemDir);

      const inputLines = testCases.map(tc => tc.input.trim());
      const outputLines = testCases.map(tc => tc.expectedOutput.trim());

      fs.writeFileSync(path.join(problemDir, "input.txt"), JSON.stringify(inputLines, null, 2), "utf-8");
      fs.writeFileSync(path.join(problemDir, "expected_output.txt"), JSON.stringify(outputLines, null, 2), "utf-8");
    }

    res.json({ message: "Problem updated successfully", problem: updated });
  } catch (err) {
    console.error("Error in editProblem:", err);
    res.status(500).json({ error: err.message });
  }
};

// Submit full test cases for a problem
exports.submitProblem = async (req, res) => {
  const { code, language } = req.body;
  const problemId = req.params.id;

  if (!code || !language) {
    return res.status(400).json({ error: "Code and language are required" });
  }

  try {
    const response = await axios.post(`${COMPILER_URL}/api/problems/${problemId}/submit`, {
      code,
      language
    });

    res.status(response.status).json(response.data);
  } catch (err) {
    console.error("❌ Error during submission:", err.message);
    res.status(500).json({ error: "Failed to connect to compiler", details: err.message });
  }
};

// Run first 3 test cases + optional custom input
exports.runProblem = async (req, res) => {
  const { code, language, customInput } = req.body;
  const problemId = req.params.id;

  if (!code || !language || !problemId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const response = await axios.post(`${COMPILER_URL}/api/run`, {
      code,
      language,
      customInput,
      problemId
    });

    res.status(response.status).json(response.data);
  } catch (err) {
    console.error("❌ Error during run:", err.message);
    res.status(500).json({ error: "Run failed", details: err.message });
  }
};

// List all problems
exports.listProblems = async (req, res) => {
  try {
    const problems = await Problem.find({}, "title description difficulty");
    res.json(problems);
  } catch (err) {
    console.error("Error in listProblems:", err);
    res.status(500).json({ error: "Failed to fetch problems" });
  }
};

// Delete a problem
exports.deleteProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Problem.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "Problem not found" });

    const problemDir = path.join(PROBLEM_DATA_DIR, id);
    if (fs.existsSync(problemDir)) {
      fs.rmSync(problemDir, { recursive: true, force: true });
    }

    res.json({ message: "Problem deleted successfully" });
  } catch (err) {
    console.error("Error in deleteProblem:", err);
    res.status(500).json({ error: err.message });
  }
};
