const Submission = require("../models/Submission");
const User = require("../models/User");
const Problem = require("../models/problems"); // Make sure you have this model

const createSubmission = async (req, res) => {
  try {
    const { problemId, code, language, status } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!problemId || !code || !language) {
      return res.status(400).json({ 
        error: "Missing required fields: problemId, code, and language are required" 
      });
    }

    // Check if problem exists (optional but recommended)
    const problemExists = await Problem.findById(problemId);
    if (!problemExists) {
      return res.status(404).json({ error: "Problem not found" });
    }

    const newSubmission = await Submission.create({
      user: userId,
      problem: problemId,
      code,
      language,
      status: status || "Pending", // Default to "Pending" if not provided
    });

    // Populate the problem field before returning
    await newSubmission.populate("problem", "title");

    console.log("Submission created successfully:", newSubmission._id);
    res.status(201).json(newSubmission);
  } catch (err) {
    console.error("Error creating submission:", err);
    res.status(500).json({ 
      error: "Failed to save submission",
      details: err.message 
    });
  }
};

const getSubmissionHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log("Fetching submission history for user:", userId);
    
    const submissions = await Submission.find({ user: userId })
      .populate("problem", "title")
      .sort({ createdAt: -1 });

    console.log("Found submissions:", submissions.length);
    
    res.json(submissions);
  } catch (err) {
    console.error("Error fetching submission history:", err);
    res.status(500).json({ 
      error: "Failed to fetch history",
      details: err.message 
    });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await Submission.aggregate([
      { $match: { status: "Success" } },
      { $group: { _id: { user: "$user", problem: "$problem" } } },
      { $group: { _id: "$_id.user", solvedCount: { $sum: 1 } } },
      { $sort: { solvedCount: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          solvedCount: 1,
          username: { $arrayElemAt: ["$user.email", 0] },
        },
      },
    ]);

    res.json(leaderboard);
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    res.status(500).json({ 
      error: "Failed to fetch leaderboard",
      details: err.message 
    });
  }
};

module.exports = {
  createSubmission,
  getSubmissionHistory,
  getLeaderboard,
};