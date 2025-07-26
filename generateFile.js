const mongoose = require("mongoose");
const { Readable } = require("stream");
const { v4: uuid } = require("uuid");
const fs = require("fs");
const path = require("path");
const os = require("os");

const tempDir = os.tmpdir();

let gridfsBucket;

mongoose.connection.on("connected", () => {
  gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "codefiles",
  });
});

const generateFile = async (extension, content) => {
  const jobId = uuid();
  const filename = `${jobId}.${extension}`;
  const filepath = path.join(tempDir, filename);

  // Write to local temp file
  fs.writeFileSync(filepath, content);

  // Upload to GridFS
  if (gridfsBucket) {
    try {
      const stream = Readable.from([content]);
      const uploadStream = gridfsBucket.openUploadStream(filename);
      stream.pipe(uploadStream);

      await new Promise((resolve, reject) => {
        uploadStream.on("finish", resolve);
        uploadStream.on("error", reject);
      });
    } catch (err) {
      console.warn("GridFS upload failed:", err.message);
    }
  }

  return filename; // return filename only, for reading from GridFS
};

const cleanupFile = (filepath) => {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (err) {
    console.warn("Cleanup failed:", filepath, err.message);
  }
};

module.exports = { generateFile, cleanupFile, getGridFSBucket: () => gridfsBucket };
