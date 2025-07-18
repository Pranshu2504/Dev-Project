const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    unique: true // Prevents duplicate titles
  },
  description: { 
    type: String, 
    required: true 
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Easy'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update the updatedAt field before saving
problemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Problem', problemSchema);