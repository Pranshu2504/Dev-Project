const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema({
  id: String,
  username: String,
  problemId: String,
  language: String,
  status: String, // "pass", "fail", "error"
  passedCount: Number,
  totalTests: Number,
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Submission", submissionSchema);
