import React, { useEffect, useState, useContext } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Button,
  Box,
  Paper,
  TextField,
  CircularProgress,
  Divider,
  MenuItem as MuiMenuItem,
  Slider,
  CssBaseline,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Editor from "@monaco-editor/react";
import { DarkModeContext } from "../context/DarkMode";

const languages = ["cpp", "python", "java"];
const API = process.env.REACT_APP_API_URL;
const AI_API = process.env.REACT_APP_AI_URL; // Add this line

const languageBoilerplates = {
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    // your code goes here
    return 0;
}`,
  python: `# your code goes here
def main():
    pass

if __name__ == "__main__":
    main()`,
  java: `public class Main {
    public static void main(String[] args) {
        // your code goes here
    }
}`,
};

export default function SolveProblem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useContext(DarkModeContext);

  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState(languageBoilerplates.cpp);
  const [language, setLanguage] = useState("cpp");
  const [customInput, setCustomInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [editorHeight, setEditorHeight] = useState(400);
  const [anchorEl, setAnchorEl] = useState(null);
  const [aiHelp, setAiHelp] = useState("");
  const [aiResponseReady, setAiResponseReady] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const res = await axios.get(`${API}/api/problems/${id}`);
        setProblem(res.data);
      } catch (error) {
        console.error("Error fetching problem:", error);
      }
    };
    fetchProblem();
  }, [id]);

  const handleRun = async () => {
    setLoading(true);
    setResults(null);
    try {
      const res = await axios.post(`${API}/api/problems/${id}/run`, {
        code,
        language,
        customInput,
      });
      setResults(res.data);
    } catch (err) {
      console.error("Run error:", err);
      setResults({ 
        error: err.response?.data?.error || "Run failed.",
        testResults: []
      });
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setResults(null);
    try {
      const res = await axios.post(`${API}/api/problems/${id}/submit`, {
        code,
        language,
      });
      
      // Backend now returns consistent structure
      setResults(res.data);
    } catch (err) {
      console.error("Submit error:", err);
      setResults({ 
        error: err.response?.data?.error || "Submission failed.",
        testResults: []
      });
    }
    setLoading(false);
  };

  const handleAIHelp = async () => {
    setLoadingAI(true);
    try {
      // Use AI_API instead of API for AI help requests
      const res = await axios.post(`${AI_API}/api/ai-help`, {
        prompt: `Problem Title: ${problem.title}\n\nProblem Description: ${problem.description}\n\nUser Code:\n${code}\n\nSuggest improvements or optimizations and error handling in 4 short bullet points.`,
      });
      setAiHelp(res.data.answer || "AI could not generate a response.");
      setAiResponseReady(true);
    } catch (err) {
      console.error("AI Help error:", err);
      console.error("Request URL:", err.config?.url);
      setAiHelp("Something went wrong while fetching AI help.");
      setAiResponseReady(true);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setLanguage(lang);
    setCode(languageBoilerplates[lang]);
  };

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  return (
    <>
      <CssBaseline />
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: "bold" }}>
            🧩 Solve Problem
          </Typography>
          <IconButton onClick={toggleDarkMode} color="inherit" sx={{ mr: 1 }}>
            {darkMode ? "🌙" : "🌞"}
          </IconButton>
          <Button color="inherit" onClick={() => navigate("/")}>
            🏠 Home
          </Button>
          <IconButton onClick={handleMenuOpen} color="inherit">
            <Avatar sx={{ width: 32, height: 32 }}>U</Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
            <MenuItem onClick={() => navigate("/login")}>🚪 Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: "flex", height: "calc(100vh - 64px)", bgcolor: darkMode ? "#121212" : "#fafafa" }}>
        <Box
          sx={{
            width: "40%",
            p: 3,
            overflowY: "auto",
            borderRight: "1px solid",
            borderColor: "divider",
            bgcolor: darkMode ? "#1e1e1e" : "#fff",
          }}
        >
          {problem ? (
            <>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {problem.title}
              </Typography>
              <Typography sx={{ whiteSpace: "pre-wrap", color: "text.secondary" }} paragraph>
                {problem.description}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                🧪 Sample Test Cases
              </Typography>
              {problem.testCases && problem.testCases.slice(0, 3).map((tc, i) => (
                <Paper
                  key={i}
                  variant="outlined"
                  sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    backgroundColor: darkMode ? "#2c2c2c" : "#f5f5f5",
                  }}
                >
                  <Typography fontWeight="bold" color="primary">
                    Test Case {i + 1}
                  </Typography>
                  <Typography fontFamily="monospace" sx={{ whiteSpace: "pre-wrap", mt: 1 }}>
                    <strong>Input:</strong> {tc.input}
                  </Typography>
                  <Typography fontFamily="monospace" sx={{ whiteSpace: "pre-wrap" }}>
                    <strong>Expected:</strong> {tc.expectedOutput}
                  </Typography>
                </Paper>
              ))}
              {aiResponseReady && (
                <Box mt={4}>
                  <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    🤖 <span>AI Suggestions</span>
                  </Typography>
                  <Paper
                    elevation={3}
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      backgroundColor: darkMode ? "#1a1a1a" : "#f9f9f9",
                      border: `1px solid ${darkMode ? "#444" : "#ddd"}`,
                    }}
                  >
                    {aiHelp
                      .split("\n")
                      .filter((point) => point.trim() !== "")
                      .map((point, idx) => (
                        <Box key={idx} sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 2, pl: 1 }}>
                          <Typography variant="h6" sx={{ color: darkMode ? "#81c784" : "#4caf50" }}>
                            •
                          </Typography>
                          <Typography sx={{ whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>{point}</Typography>
                        </Box>
                      ))}
                  </Paper>
                </Box>
              )}
            </>
          ) : (
            <Box textAlign="center" mt={10}>
              <CircularProgress />
              <Typography>Loading problem...</Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ width: "60%", p: 3, overflowY: "auto" }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2, gap: 2 }}>
            <TextField
              select
              value={language}
              onChange={handleLanguageChange}
              size="small"
              label="Language"
              sx={{ width: 140 }}
            >
              {languages.map((lang) => (
                <MuiMenuItem key={lang} value={lang}>
                  {lang.toUpperCase()}
                </MuiMenuItem>
              ))}
            </TextField>
            <Button variant="contained" onClick={handleRun} disabled={loading}>
              ▶️ Run Code
            </Button>
            <Button variant="contained" color="success" onClick={handleSubmit} disabled={loading}>
              ✅ Submit
            </Button>
            <Button variant="outlined" onClick={handleAIHelp} disabled={loadingAI || !problem}>
              🤖 AI Help
            </Button>
            {(loading || loadingAI) && <CircularProgress size={24} />}
          </Box>

          <Editor
            height={`${editorHeight}px`}
            theme={darkMode ? "vs-dark" : "light"}
            language={language}
            value={code}
            onChange={(val) => setCode(val)}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              wordWrap: "on",
              scrollBeyondLastLine: false,
            }}
          />

          <Box mt={2}>
            <Typography variant="caption" color="text.secondary">
              Adjust Editor Height
            </Typography>
            <Slider value={editorHeight} onChange={(e, val) => setEditorHeight(val)} min={200} max={800} />
          </Box>

          <TextField
            label="Custom Input (Run only)"
            fullWidth
            multiline
            minRows={3}
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            sx={{ mt: 2 }}
          />

          {results && (
            <Paper variant="outlined" sx={{ mt: 4, p: 3, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                🧾 Test Results
              </Typography>
              
              {/* Show submission status */}
              {results.status && (
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: results.status === "pass" ? "success.main" : 
                            results.status === "fail" ? "error.main" : "warning.main"
                    }}
                  >
                    {results.status === "pass" ? "✅ All Tests Passed!" : 
                     results.status === "fail" ? "❌ Some Tests Failed" : 
                     "⚠️ Execution Error"}
                  </Typography>
                </Box>
              )}

              {results.error && (
                <Typography color="error" sx={{ mt: 2, fontFamily: "monospace" }}>
                  ❌ {results.error}
                </Typography>
              )}

              {results.testResults && results.testResults.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  {results.testResults.map((res, i) => (
                    <Paper
                      key={i}
                      sx={{
                        p: 2,
                        mt: 2,
                        backgroundColor: res.passed ? "#e8f5e9" : "#ffebee",
                        borderLeft: `6px solid ${res.passed ? "#2e7d32" : "#c62828"}`,
                      }}
                    >
                      <Typography fontWeight="bold">
                        {res.passed ? "✅" : "❌"} Test Case {res.testCase || i + 1}
                      </Typography>
                      <Typography fontFamily="monospace" sx={{ mt: 1 }}>
                        <strong>Output:</strong> {res.actualOutput || "No output"}
                      </Typography>
                      <Typography fontFamily="monospace">
                        <strong>Expected:</strong> {res.expectedOutput || "No expected output"}
                      </Typography>
                      {res.stderr && (
                        <Typography fontFamily="monospace" color="error">
                          <strong>Error:</strong> {res.stderr}
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Box>
              )}

              {results.customResult && (
                <Paper sx={{ p: 2, mt: 3, backgroundColor: "#fff8e1", borderLeft: "6px solid #f9a825" }}>
                  <Typography fontWeight="bold">📥 Custom Input Result</Typography>
                  <Typography fontFamily="monospace" sx={{ mt: 1 }}>
                    <strong>Input:</strong> {results.customResult.input}
                  </Typography>
                  <Typography fontFamily="monospace">
                    <strong>Output:</strong> {results.customResult.output || "No output"}
                  </Typography>
                  {results.customResult.stderr && (
                    <Typography fontFamily="monospace" color="error">
                      <strong>Error:</strong> {results.customResult.stderr}
                    </Typography>
                  )}
                </Paper>
              )}
            </Paper>
          )}
        </Box>
      </Box>
    </>
  );
}