const { exec } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { getGridFSBucket } = require("./generateFile");

const tempDir = os.tmpdir();

const executeCode = ({ language, filepath, input }) => {
  return new Promise((resolve, reject) => {
    const gridfsBucket = getGridFSBucket();
    if (!gridfsBucket) {
      return reject(new Error("❌ GridFS bucket not initialized"));
    }

    const uniqueId = uuidv4();
    const fileName = path.basename(filepath);
    const tempCodePath = path.join(tempDir, `${uniqueId}-${fileName}`);
    const inputPath = path.join(tempDir, `${uniqueId}.input.txt`);
    const outputPath = path.join(tempDir, `${uniqueId}.output.txt`);

    const downloadStream = gridfsBucket.openDownloadStreamByName(filepath);
    const fileWriteStream = fs.createWriteStream(tempCodePath);

    downloadStream.pipe(fileWriteStream);

    fileWriteStream.on("error", (err) => {
      return reject(new Error("❌ Failed to write temp file: " + err.message));
    });

    fileWriteStream.on("finish", () => {
      fs.writeFileSync(inputPath, input || "");

      let compileCmd = "";
      let runCmd = "";

      switch (language) {
        case "cpp": {
          const outPath = tempCodePath.replace(".cpp", ".out");
          compileCmd = `g++ "${tempCodePath}" -o "${outPath}"`;
          runCmd = `${outPath} < "${inputPath}" > "${outputPath}"`;
          break;
        }
        case "python":
          runCmd = `python3 "${tempCodePath}" < "${inputPath}" > "${outputPath}"`;
          break;
        case "java": {
          const className = path.basename(tempCodePath).replace(".java", "");
          compileCmd = `javac "${tempCodePath}"`;
          runCmd = `java -cp "${path.dirname(tempCodePath)}" ${className} < "${inputPath}" > "${outputPath}"`;
          break;
        }
        default:
          return resolve({ output: "", stderr: "❌ Unsupported language" });
      }

      const run = () => {
        exec(runCmd, { timeout: 5000 }, (err, stdout, stderr) => {
          let output = "";
          if (fs.existsSync(outputPath)) {
            output = fs.readFileSync(outputPath, "utf-8");
          }

          [tempCodePath, inputPath, outputPath].forEach((f) => {
            if (fs.existsSync(f)) fs.unlinkSync(f);
          });

          resolve({
            output,
            stderr: stderr || (err ? err.message : ""),
          });
        });
      };

      if (compileCmd) {
        exec(compileCmd, (err, _, stderr) => {
          if (err) {
            return resolve({ output: "", stderr: stderr || err.message });
          }
          run();
        });
      } else {
        run();
      }
    });
  });
};

module.exports = { executeCode };
