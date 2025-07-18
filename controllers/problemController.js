const mongoose = require("mongoose");
const Problem = require("../models/problems");
const axios = require("axios");
const { Readable } = require("stream");
require("dotenv").config();

const COMPILER_URL = process.env.COMPILER_URL || "http://localhost:7000";

let gfs;
const conn = mongoose.connection;

// Ensure GridFS initializes once DB is ready
conn.once("open", () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "problem_data",
  });
});

// === 🔧 Embedded GridFS Utilities ===

// Read file from GridFS
const readGridFSFile = (filename) => {
  return new Promise((resolve, reject) => {
    if (!gfs) return reject(new Error("GridFS not initialized"));
    let data = "";
    const stream = gfs.openDownloadStreamByName(filename);
    stream.on("data", (chunk) => (data += chunk));
    stream.on("end", () => resolve(data));
    stream.on("error", reject);
  });
};

// Write file to GridFS (replace old if exists)
const writeGridFSFile = (filename, content) => {
  return new Promise((resolve, reject) => {
    if (!gfs) return reject(new Error("GridFS not initialized"));
    gfs.find({ filename }).toArray((err, files) => {
      if (err) return reject(err);
      const upload = () => {
        const stream = gfs.openUploadStream(filename);
        Readable.from(content).pipe(stream).on("finish", resolve).on("error", reject);
      };
      if (files.length > 0) {
        gfs.delete(files[0]._id, upload);
      } else {
        upload();
      }
    });
  });
};

// Delete file if exists in GridFS
const deleteGridFSFileIfExists = (filename) => {
  if (!gfs) return;
  gfs.find({ filename }).toArray((err, files) => {
    if (!err && files.length > 0) {
      gfs.delete(files[0]._id, () => {});
    }
  });
};

// === 🚀 Controller Methods ===

// Create a new problem
exports.createProblem = async (req, res) => {
  try {
    const { title, description, difficulty, testCases } = req.body;

    if (!title || !description || !difficulty || !Array.isArray(testCases)) {
      return res.status(400).json({ error: "All fields and testCases array are required." });
    }

    const cleanedTestCases = testCases
      .map((tc) => ({
        input: tc.input?.trim(),
        expectedOutput: tc.expectedOutput?.trim(),
      }))
      .filter((tc) => tc.input && tc.expectedOutput);

    if (cleanedTestCases.length === 0) {
      return res.status(400).json({ error: "At least one valid test case is required." });
    }

    const exists = await Problem.findOne({ title });
    if (exists) {
      return res.status(400).json({ error: "Problem with this title already exists." });
    }

    const newProblem = new Problem({ title, description, difficulty });
    await newProblem.save();

    const id = newProblem._id.toString();
    const inputs = cleanedTestCases.map((tc) => tc.input);
    const outputs = cleanedTestCases.map((tc) => tc.expectedOutput);

    await writeGridFSFile(`${id}_input.txt`, JSON.stringify(inputs, null, 2));
    await writeGridFSFile(`${id}_expected_output.txt`, JSON.stringify(outputs, null, 2));

    res.status(201).json({ message: "Problem created successfully", id });
  } catch (err) {
    console.error("❌ Error in createProblem:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get problem by ID
exports.getProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const problem = await Problem.findById(id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    let testCases = [];
    try {
      const input = JSON.parse(await readGridFSFile(`${id}_input.txt`));
      const output = JSON.parse(await readGridFSFile(`${id}_expected_output.txt`));
      testCases = input.map((input, i) => ({
        input,
        expectedOutput: output[i] || "",
      }));
    } catch (err) {
      console.warn("⚠️ No test cases found in GridFS for problem:", id);
    }

    res.json({ ...problem.toObject(), testCases });
  } catch (err) {
    console.error("❌ Error in getProblem:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Edit a problem
exports.editProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, difficulty, testCases } = req.body;

    const updated = await Problem.findByIdAndUpdate(
      id,
      { title, description, difficulty },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Problem not found" });

    if (Array.isArray(testCases) && testCases.length > 0) {
      const cleaned = testCases
        .map((tc) => ({
          input: tc.input?.trim(),
          expectedOutput: tc.expectedOutput?.trim(),
        }))
        .filter((tc) => tc.input && tc.expectedOutput);

      if (cleaned.length > 0) {
        const inputs = cleaned.map((tc) => tc.input);
        const outputs = cleaned.map((tc) => tc.expectedOutput);
        await writeGridFSFile(`${id}_input.txt`, JSON.stringify(inputs, null, 2));
        await writeGridFSFile(`${id}_expected_output.txt`, JSON.stringify(outputs, null, 2));
      }
    }

    res.json({ message: "Problem updated successfully", problem: updated });
  } catch (err) {
    console.error("❌ Error in editProblem:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Submit solution
exports.submitProblem = async (req, res) => {
  const { code, language } = req.body;
  const problemId = req.params.id;

  if (!code || !language) {
    return res.status(400).json({ error: "Code and language are required" });
  }

  try {
    const response = await axios.post(`${COMPILER_URL}/api/problems/${problemId}/submit`, {
      code,
      language,
    });

    res.status(response.status).json(response.data);
  } catch (err) {
    console.error("❌ Error during submission:", err.message);
    res.status(500).json({ error: "Compiler service error", details: err.message });
  }
};

// Run solution
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
      problemId,
    });

    res.status(response.status).json(response.data);
  } catch (err) {
    console.error("❌ Error during run:", err.message);
    res.status(500).json({ error: "Run failed", details: err.message });
  }
};

// List problems
exports.listProblems = async (req, res) => {
  try {
    const problems = await Problem.find({}, "title description difficulty");
    res.json(problems);
  } catch (err) {
    console.error("❌ Error in listProblems:", err);
    res.status(500).json({ error: "Failed to fetch problems" });
  }
};

// Delete a problem
exports.deleteProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Problem.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "Problem not found" });

    deleteGridFSFileIfExists(`${id}_input.txt`);
    deleteGridFSFileIfExists(`${id}_expected_output.txt`);

    res.json({ message: "Problem deleted successfully" });
  } catch (err) {
    console.error("❌ Error in deleteProblem:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
