const mongoose = require("mongoose");
const { Readable } = require("stream");
const { v4: uuid } = require("uuid");
const fs = require("fs");
const path = require("path");

let gridfsBucket;

mongoose.connection.on("connected", () => {
  gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "codefiles",
  });
});

const generateFile = async (extension, content) => {
  const jobId = uuid();
  const filename = `${jobId}.${extension}`;
  
  // Create a temporary directory if it doesn't exist
  const tempDir = path.join(__dirname, "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Create the full filepath
  const filepath = path.join(tempDir, filename);
  
  // Write the file to disk for execution
  fs.writeFileSync(filepath, content);
  
  // Also save to GridFS for persistence (optional)
  if (gridfsBucket) {
    try {
      const buffer = Buffer.from(content, "utf-8");
      const stream = Readable.from(buffer);
      const uploadStream = gridfsBucket.openUploadStream(filename);
      stream.pipe(uploadStream);
      
      // Wait for GridFS upload to complete (optional)
      await new Promise((resolve, reject) => {
        uploadStream.on("finish", resolve);
        uploadStream.on("error", reject);
      });
    } catch (error) {
      console.warn("GridFS upload failed:", error.message);
      // Continue execution even if GridFS fails
    }
  }
  
  // Return the filepath for execution
  return filepath;
};

// Helper function to clean up temporary files
const cleanupFile = (filepath) => {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (error) {
    console.warn("Failed to cleanup file:", filepath, error.message);
  }
};

module.exports = { generateFile, cleanupFile };