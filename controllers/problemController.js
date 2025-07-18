const mongoose = require("mongoose");
const Problem = require("../models/problems");
const axios = require("axios");
const { Readable } = require("stream");
require("dotenv").config();

const COMPILER_URL = process.env.COMPILER_URL || "http://localhost:7000";

let gfs;
let gridFSBucket;

// Initialize GridFS when MongoDB connects
const initializeGridFS = () => {
  return new Promise((resolve, reject) => {
    if (mongoose.connection.readyState === 1) {
      // Already connected
      gridFSBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "problem_data",
      });
      gfs = gridFSBucket;
      console.log("✅ GridFS initialized successfully");
      resolve();
    } else {
      // Wait for connection
      mongoose.connection.once("open", () => {
        try {
          gridFSBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: "problem_data",
          });
          gfs = gridFSBucket;
          console.log("✅ GridFS initialized successfully");
          resolve();
        } catch (error) {
          console.error("❌ GridFS initialization failed:", error);
          reject(error);
        }
      });
    }
  });
};

// Call this when your app starts
initializeGridFS().catch(console.error);

// === 🔧 GridFS Utilities ===

const readGridFSFile = (filename) => {
  return new Promise((resolve, reject) => {
    if (!gfs) {
      return reject(new Error("GridFS not initialized"));
    }
    
    let data = "";
    const stream = gfs.openDownloadStreamByName(filename);
    
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
};

const writeGridFSFile = (filename, content) => {
  return new Promise(async (resolve, reject) => {
    if (!gfs) {
      return reject(new Error("GridFS not initialized"));
    }

    try {
      // Check if file exists and delete it
      const files = await gfs.find({ filename }).toArray();
      if (files.length > 0) {
        await gfs.delete(files[0]._id);
      }

      // Create new file
      const uploadStream = gfs.openUploadStream(filename);
      const readable = Readable.from(content);
      
      uploadStream.on("error", (error) => {
        console.error(`❌ Error writing GridFS file ${filename}:`, error);
        reject(error);
      });
      
      uploadStream.on("finish", () => {
        console.log(`✅ GridFS file ${filename} written successfully`);
        resolve();
      });
      
      readable.pipe(uploadStream);
    } catch (error) {
      console.error(`❌ Error in writeGridFSFile for ${filename}:`, error);
      reject(error);
    }
  });
};

const deleteGridFSFileIfExists = async (filename) => {
  if (!gfs) {
    console.warn("GridFS not initialized, cannot delete file:", filename);
    return;
  }
  
  try {
    const files = await gfs.find({ filename }).toArray();
    if (files.length > 0) {
      await gfs.delete(files[0]._id);
      console.log(`✅ GridFS file ${filename} deleted successfully`);
    }
  } catch (error) {
    console.error(`❌ Error deleting GridFS file ${filename}:`, error);
  }
};

// === 🚀 Controller Methods ===

// Create a new problem
exports.createProblem = async (req, res) => {
  try {
    const { title, description, difficulty, testCases } = req.body;

    // Validate required fields
    if (!title || !description || !difficulty || !Array.isArray(testCases)) {
      return res.status(400).json({ 
        error: "All fields and testCases array are required." 
      });
    }

    // Clean and validate test cases
    const cleanedTestCases = testCases
      .map((tc) => ({
        input: tc.input?.trim(),
        expectedOutput: tc.expectedOutput?.trim(),
      }))
      .filter((tc) => tc.input && tc.expectedOutput);

    if (cleanedTestCases.length === 0) {
      return res.status(400).json({ 
        error: "At least one valid test case is required." 
      });
    }

    // Check if problem already exists
    const exists = await Problem.findOne({ title });
    if (exists) {
      return res.status(400).json({ 
        error: "Problem with this title already exists." 
      });
    }

    // Ensure GridFS is initialized
    if (!gfs) {
      console.log("GridFS not initialized, attempting to initialize...");
      await initializeGridFS();
    }

    // Create problem in database
    const newProblem = new Problem({ title, description, difficulty });
    await newProblem.save();

    const id = newProblem._id.toString();
    const inputFileName = `${id}_input.txt`;
    const outputFileName = `${id}_expected_output.txt`;

    // Prepare test case data
    const inputs = cleanedTestCases.map((tc) => tc.input);
    const outputs = cleanedTestCases.map((tc) => tc.expectedOutput);

    // Save test cases to GridFS
    try {
      await writeGridFSFile(inputFileName, JSON.stringify(inputs, null, 2));
      await writeGridFSFile(outputFileName, JSON.stringify(outputs, null, 2));
      
      console.log(`✅ Problem created successfully with ID: ${id}`);
      res.status(201).json({ 
        message: "Problem created successfully", 
        id,
        testCasesCount: cleanedTestCases.length
      });
    } catch (gridFSError) {
      // If GridFS fails, delete the problem from database
      await Problem.findByIdAndDelete(id);
      console.error("❌ GridFS error, rolling back problem creation:", gridFSError);
      throw new Error("Failed to save test cases");
    }

  } catch (err) {
    console.error("❌ Error in createProblem:", err);
    res.status(500).json({ 
      error: "Internal server error", 
      details: err.message 
    });
  }
};

// Get problem by ID
exports.getProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const problem = await Problem.findById(id);
    
    if (!problem) {
      return res.status(404).json({ error: "Problem not found" });
    }

    const inputFileName = `${id}_input.txt`;
    const outputFileName = `${id}_expected_output.txt`;

    let testCases = [];
    
    if (gfs) {
      try {
        const inputData = await readGridFSFile(inputFileName);
        const outputData = await readGridFSFile(outputFileName);
        
        const inputs = JSON.parse(inputData);
        const outputs = JSON.parse(outputData);
        
        testCases = inputs.map((inp, i) => ({
          input: inp,
          expectedOutput: outputs[i] || "",
        }));
      } catch (err) {
        console.warn("⚠️ Error reading test cases for problem:", id, err.message);
        testCases = [];
      }
    } else {
      console.warn("⚠️ GridFS not initialized, returning problem without test cases");
    }

    res.json({ 
      ...problem.toObject(), 
      testCases,
      testCasesCount: testCases.length
    });
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
    
    if (!updated) {
      return res.status(404).json({ error: "Problem not found" });
    }

    // Update test cases if provided
    if (Array.isArray(testCases) && testCases.length > 0 && gfs) {
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

// Run solution - Updated to use consistent endpoint
exports.runProblem = async (req, res) => {
  const { code, language, customInput } = req.body;
  const problemId = req.params.id;

  if (!code || !language || !problemId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Use the consistent endpoint format
    const response = await axios.post(`${COMPILER_URL}/api/problems/${problemId}/run`, {
      code,
      language,
      customInput,
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
    const problems = await Problem.find({}, "title difficulty");
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
    
    if (!deleted) {
      return res.status(404).json({ error: "Problem not found" });
    }

    // Delete associated GridFS files
    await deleteGridFSFileIfExists(`${id}_input.txt`);
    await deleteGridFSFileIfExists(`${id}_expected_output.txt`);

    res.json({ message: "Problem deleted successfully" });
  } catch (err) {
    console.error("❌ Error in deleteProblem:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Export the initialization function for use in your main app
exports.initializeGridFS = initializeGridFS;