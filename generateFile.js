const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");

const codesDir = path.join(__dirname, "codes");

if (!fs.existsSync(codesDir)) {
  fs.mkdirSync(codesDir, { recursive: true });
}

const generateFile = (extension, content) => {
  const jobId = uuid();
  const filename = `${jobId}.${extension}`;
  const filePath = path.join(codesDir, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
};

module.exports = { generateFile };
