const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");

const executeCode = ({ language, filepath, input }) => {
  return new Promise((resolve) => {
    const jobId = uuid();
    const inputPath = path.join(__dirname, "outputs", `${jobId}_input.txt`);
    const outputPath = path.join(__dirname, "outputs", `${jobId}_output.txt`);
    fs.writeFileSync(inputPath, input || "");

    let compileCmd = "";
    let runCmd = "";
    let tempBinaryPath = null;

    switch (language) {
      case "cpp":
        tempBinaryPath = filepath.replace(/\.cpp$/, `_${jobId}.out`);
        compileCmd = `g++ "${filepath}" -o "${tempBinaryPath}"`;
        runCmd = `${tempBinaryPath} < "${inputPath}" > "${outputPath}"`;
        break;
      case "python":
        runCmd = `python3 "${filepath}" < "${inputPath}" > "${outputPath}"`;
        break;
      case "java": {
        const className = path.basename(filepath).replace(".java", "");
        compileCmd = `javac "${filepath}"`;
        runCmd = `java -cp "${path.dirname(filepath)}" ${className} < "${inputPath}" > "${outputPath}"`;
        break;
      }
      default:
        return resolve({ stderr: "Unsupported language", output: "" });
    }

    const cleanup = () => {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      if (tempBinaryPath && fs.existsSync(tempBinaryPath)) fs.unlinkSync(tempBinaryPath);
    };

    const run = () => {
      exec(runCmd, { timeout: 5000 }, (err, stdout, stderr) => {
        const output = fs.existsSync(outputPath)
          ? fs.readFileSync(outputPath, "utf-8")
          : "";
        cleanup();
        resolve({ output, stderr: stderr || (err ? err.message : "") });
      });
    };

    if (compileCmd) {
      exec(compileCmd, (compileErr, _, compileStderr) => {
        if (compileErr) {
          cleanup();
          return resolve({ output: "", stderr: compileStderr || compileErr.message });
        }
        run();
      });
    } else {
      run();
    }
  });
};

module.exports = { executeCode };
