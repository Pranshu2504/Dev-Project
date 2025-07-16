const { exec } = require("child_process");
const mongoose = require("mongoose");
const fs = require("fs");
const os = require("os");
const path = require("path");

const tempDir = os.tmpdir();
let gridfsBucket;

mongoose.connection.on("connected", () => {
  gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "codefiles",
  });
});

const executeCode = ({ language, filepath, input }) => {
  return new Promise((resolve, reject) => {
    const tempCodePath = path.join(tempDir, filepath);

    const download = gridfsBucket.openDownloadStreamByName(filepath);
    const codeWriteStream = fs.createWriteStream(tempCodePath);
    download.pipe(codeWriteStream);

    codeWriteStream.on("finish", () => {
      const inputPath = path.join(tempDir, `${filepath}.input.txt`);
      const outputPath = path.join(tempDir, `${filepath}.output.txt`);
      fs.writeFileSync(inputPath, input || "");

      let compileCmd = "";
      let runCmd = "";

      switch (language) {
        case "cpp":
          const outPath = tempCodePath.replace(".cpp", ".out");
          compileCmd = `g++ "${tempCodePath}" -o "${outPath}"`;
          runCmd = `${outPath} < "${inputPath}" > "${outputPath}"`;
          break;
        case "python":
          runCmd = `python3 "${tempCodePath}" < "${inputPath}" > "${outputPath}"`;
          break;
        case "java":
          const className = path.basename(tempCodePath).replace(".java", "");
          compileCmd = `javac "${tempCodePath}"`;
          runCmd = `java -cp "${path.dirname(tempCodePath)}" ${className} < "${inputPath}" > "${outputPath}"`;
          break;
        default:
          return resolve({ output: "", stderr: "Unsupported language" });
      }

      const run = () => {
        exec(runCmd, { timeout: 5000 }, (err, stdout, stderr) => {
          const output = fs.existsSync(outputPath)
            ? fs.readFileSync(outputPath, "utf-8")
            : "";
          resolve({ output, stderr: stderr || (err ? err.message : "") });
        });
      };

      if (compileCmd) {
        exec(compileCmd, (err, _, stderr) => {
          if (err) return resolve({ output: "", stderr: stderr || err.message });
          run();
        });
      } else {
        run();
      }
    });

    codeWriteStream.on("error", reject);
  });
};

module.exports = { executeCode };
