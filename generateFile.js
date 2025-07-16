const mongoose = require("mongoose");
const { Readable } = require("stream");
const { v4: uuid } = require("uuid");

let gridfsBucket;

mongoose.connection.on("connected", () => {
  gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "codefiles",
  });
});

const generateFile = async (extension, content) => {
  const jobId = uuid();
  const filename = `${jobId}.${extension}`;
  const buffer = Buffer.from(content, "utf-8");

  const stream = Readable.from(buffer);
  const uploadStream = gridfsBucket.openUploadStream(filename);
  stream.pipe(uploadStream);

  return new Promise((resolve, reject) => {
    uploadStream.on("finish", () => resolve(filename));
    uploadStream.on("error", reject);
  });
};

module.exports = { generateFile };
