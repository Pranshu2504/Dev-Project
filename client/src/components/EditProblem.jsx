import React, { useEffect, useState, useContext } from "react";
import {
  Box, TextField, Button, Typography, Paper,
  CssBaseline, AppBar, Toolbar, IconButton, Avatar,
  Menu, MenuItem, createTheme, ThemeProvider, Snackbar,
  Alert
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate, useParams } from "react-router-dom";
import { DarkModeContext } from "../context/DarkMode";
import { motion } from "framer-motion";
import axios from "axios";

function EditProblem() {
  const { id } = useParams();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [testCases, setTestCases] = useState([{ input: "", expectedOutput: "" }]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { darkMode } = useContext(DarkModeContext);
  const API = process.env.REACT_APP_API_URL;

  const theme = createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
      primary: {
        main: darkMode ? "#90caf9" : "#1976d2",
      },
    },
    shape: {
      borderRadius: 16,
    },
  });

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const res = await axios.get(`${API}/api/problems/${id}`);
        setTitle(res.data.title);
        setDescription(res.data.description);
        setTestCases(res.data.testCases.length > 0 ? res.data.testCases : [{ input: "", expectedOutput: "" }]);
      } catch (err) {
        setError("Failed to fetch problem details");
      } finally {
        setLoading(false);
      }
    };
    fetchProblem();
  }, [id, API]);

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleTestCaseChange = (index, field, value) => {
    const updated = [...testCases];
    updated[index][field] = value;
    setTestCases(updated);
  };

  const handleAddTestCase = () => {
    setTestCases([...testCases, { input: "", expectedOutput: "" }]);
  };

  const handleDeleteTestCase = (index) => {
    const updated = [...testCases];
    updated.splice(index, 1);
    setTestCases(updated.length > 0 ? updated : [{ input: "", expectedOutput: "" }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const testCasesJson = testCases.map(tc => ({
        input: tc.input.trim(),
        expectedOutput: tc.expectedOutput.trim()
      }));

      await axios.put(`${API}/api/problems/${id}`, {
        title,
        description,
        difficulty: "Easy", // Adjust if needed
        testCases: testCasesJson
      }, {
        withCredentials: true
      });

      setSuccess(true);
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update problem");
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: "bold" }}>
            ✏️ Edit Problem
          </Typography>
          <Button color="inherit" onClick={() => navigate("/")}>🏠 Home</Button>
          <IconButton onClick={handleMenuOpen} color="inherit">
            <Avatar>U</Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
            <MenuItem onClick={() => navigate("/login")}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Box component={Paper} elevation={5} sx={{ maxWidth: 800, mx: "auto", mt: 6, p: 4, borderRadius: 3 }}>
          <Typography variant="h5" mb={3} fontWeight="bold">🛠️ Update Problem</Typography>

          {error && (
            <Typography color="error" mb={2}>
              {error}
            </Typography>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              label="Title"
              fullWidth
              required
              margin="normal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <TextField
              label="Description"
              fullWidth
              multiline
              required
              rows={5}
              margin="normal"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <Box mt={3}>
              <Typography variant="h6" gutterBottom>🧪 Test Cases</Typography>
              {testCases.map((tc, index) => (
                <Paper key={index} sx={{ p: 2, mb: 2, borderRadius: 2, position: "relative" }}>
                  <TextField
                    label={`Input ${index + 1}`}
                    fullWidth
                    multiline
                    rows={2}
                    value={tc.input}
                    onChange={(e) => handleTestCaseChange(index, "input", e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    label={`Expected Output ${index + 1}`}
                    fullWidth
                    multiline
                    rows={2}
                    value={tc.expectedOutput}
                    onChange={(e) => handleTestCaseChange(index, "expectedOutput", e.target.value)}
                  />
                  {testCases.length > 1 && (
                    <IconButton
                      onClick={() => handleDeleteTestCase(index)}
                      sx={{ position: "absolute", top: 8, right: 8 }}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Paper>
              ))}

              <Button variant="outlined" onClick={handleAddTestCase}>
                ➕ Add Test Case
              </Button>
            </Box>

            <Box mt={4} display="flex" gap={2}>
              <Button variant="contained" color="primary" type="submit" sx={{ fontWeight: "bold" }}>
                💾 Update
              </Button>
              <Button variant="outlined" color="secondary" onClick={() => navigate("/problems")}>
                ❌ Cancel
              </Button>
            </Box>
          </form>
        </Box>
      </motion.div>

      <Snackbar open={success} autoHideDuration={3000} onClose={() => setSuccess(false)}>
        <Alert severity="success" variant="filled" sx={{ width: "100%" }}>
          ✅ Problem updated successfully! Redirecting...
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default EditProblem;
