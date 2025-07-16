const mongoose = require("mongoose");
const Problem = require("../models/problems");
const axios = require("axios");
const { Readable } = require("stream");
require("dotenv").config();

const COMPILER_URL = process.env.COMPILER_URL || "http://localhost:7000";

let gfs;
const conn = mongoose.connection;
conn.once("open", () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "problem_data",
  });
});

// Utility to read GridFS file to string
const readGridFSFile = async (filename) => {
  return new Promise((resolve, reject) => {
    let data = "";
    const stream = gfs.openDownloadStreamByName(filename);
    stream.on("data", (chunk) => (data += chunk));
    stream.on("end", () => resolve(data));
    stream.on("error", reject);
  });
};

// Utility to write file to GridFS
const writeGridFSFile = async (filename, content) => {
  return new Promise((resolve, reject) => {
    // Delete previous if exists
    gfs.deleteMany
    gfs.find({ filename }).toArray((err, files) => {
      if (files.length > 0) {
        gfs.delete(files[0]._id, () => {
          const stream = gfs.openUploadStream(filename);
          Readable.from(content).pipe(stream).on("finish", resolve).on("error", reject);
        });
      } else {
        const stream = gfs.openUploadStream(filename);
        Readable.from(content).pipe(stream).on("finish", resolve).on("error", reject);
      }
    });
  });
};

// Create a new problem
exports.createProblem = async (req, res) => {
  try {
    const { title, description, difficulty, testCases } = req.body;

    if (!title || !description || !testCases?.length) {
      return res.status(400).json({ error: "Title, description, and test cases are required." });
    }

    const newProblem = new Problem({ title, description, difficulty });
    await newProblem.save();

    const id = newProblem._id.toString();
    const inputArr = testCases.map(tc => tc.input.trim());
    const outputArr = testCases.map(tc => tc.expectedOutput.trim());

    await writeGridFSFile(`${id}_input.txt`, JSON.stringify(inputArr, null, 2));
    await writeGridFSFile(`${id}_expected_output.txt`, JSON.stringify(outputArr, null, 2));

    res.status(201).json({ message: "Problem created successfully", id });
  } catch (err) {
    console.error("❌ Error in createProblem:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get a problem
exports.getProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const problem = await Problem.findById(id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    let testCases = [];
    try {
      const input = JSON.parse(await readGridFSFile(`${id}_input.txt`));
      const output = JSON.parse(await readGridFSFile(`${id}_expected_output.txt`));
      testCases = input.map((inp, i) => ({
        input: inp,
        expectedOutput: output[i] || ""
      }));
    } catch (e) {
      console.warn("⚠️ No test cases found in GridFS for problem:", id);
    }

    res.json({ ...problem.toObject(), testCases });
  } catch (err) {
    console.error("❌ Error in getProblem:", err);
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
      const inputArr = testCases.map(tc => tc.input.trim());
      const outputArr = testCases.map(tc => tc.expectedOutput.trim());

      await writeGridFSFile(`${id}_input.txt`, JSON.stringify(inputArr, null, 2));
      await writeGridFSFile(`${id}_expected_output.txt`, JSON.stringify(outputArr, null, 2));
    }

    res.json({ message: "Problem updated successfully", problem: updated });
  } catch (err) {
    console.error("❌ Error in editProblem:", err);
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

    const inputFile = `${id}_input.txt`;
    const outputFile = `${id}_expected_output.txt`;

    const deleteIfExists = (filename) =>
      gfs.find({ filename }).toArray((err, files) => {
        if (files.length > 0) gfs.delete(files[0]._id, () => {});
      });

    deleteIfExists(inputFile);
    deleteIfExists(outputFile);

    res.json({ message: "Problem deleted successfully" });
  } catch (err) {
    console.error("❌ Error in deleteProblem:", err);
    res.status(500).json({ error: err.message });
  }
};
