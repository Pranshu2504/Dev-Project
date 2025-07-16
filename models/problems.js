const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema({
  inputFileName: { type: String },
  expectedOutputFileName: { type: String }
});

const problemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Easy'
  },
  testCases: [testCaseSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Problem', problemSchema);
