import React, { useState, useContext } from "react";
import {
  Box, TextField, Button, MenuItem, Typography, Paper,
  CssBaseline, Snackbar, Alert, AppBar, Toolbar, IconButton,
  Avatar, Menu, MenuItem as MuiMenuItem, createTheme, ThemeProvider
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { DarkModeContext } from "../context/DarkMode";
import { motion } from "framer-motion";
import DeleteIcon from "@mui/icons-material/Delete";

const difficulties = ["Easy", "Medium", "Hard"];

function CreateProblem() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [testCases, setTestCases] = useState([{ input: "", output: "" }]);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
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

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleTestCaseChange = (index, field, value) => {
    const updated = [...testCases];
    updated[index][field] = value;
    setTestCases(updated);
  };

  const addTestCase = () => {
    setTestCases([...testCases, { input: "", output: "" }]);
  };

  const deleteTestCase = (index) => {
    const updated = [...testCases];
    updated.splice(index, 1);
    setTestCases(updated.length > 0 ? updated : [{ input: "", output: "" }]);
  };

  const handleSubmit = async () => {
    if (!title || !description || !difficulty || testCases.some(tc => !tc.input || !tc.output)) {
      setError("Please fill out all fields and test cases.");
      return;
    }

    try {
      await axios.post(`${API}/api/problems`, {
        title,
        description,
        difficulty,
        testCases: testCases.map(tc => ({
          input: tc.input.trim(),
          expectedOutput: tc.output.trim()
        }))
      });

      setSuccess(true);
      setTitle("");
      setDescription("");
      setDifficulty("");
      setTestCases([{ input: "", output: "" }]);
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError("Problem creation failed.");
      }
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: "bold" }}>
            ➕ Create Problem
          </Typography>
          <Button color="inherit" onClick={() => navigate("/")}>🏠 Home</Button>
          <IconButton onClick={handleMenuOpen} color="inherit">
            <Avatar sx={{ width: 32, height: 32 }}>U</Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
            <MuiMenuItem onClick={() => navigate("/login")}>Logout</MuiMenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Box component={Paper} elevation={6} sx={{ maxWidth: 800, mx: "auto", mt: 6, p: 4, borderRadius: 4 }}>
          <Typography variant="h5" mb={3} fontWeight="bold">
            ✍️ Create New Problem
          </Typography>

          <TextField
            label="Problem Title"
            fullWidth
            margin="normal"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <TextField
            label="Description"
            fullWidth
            multiline
            rows={6}
            margin="normal"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <TextField
            label="Difficulty"
            select
            fullWidth
            margin="normal"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            {difficulties.map((level) => (
              <MenuItem key={level} value={level}>
                {level}
              </MenuItem>
            ))}
          </TextField>

          <Box mt={4}>
            <Typography variant="h6" gutterBottom>🧪 Test Cases</Typography>
            {testCases.map((test, index) => (
              <Paper key={index} sx={{ p: 2, mb: 2, borderRadius: 3, position: "relative" }}>
                <TextField
                  label={`Input ${index + 1}`}
                  fullWidth
                  multiline
                  rows={2}
                  value={test.input}
                  onChange={(e) => handleTestCaseChange(index, "input", e.target.value)}
                  sx={{ mb: 2 }}
                />
                <TextField
                  label={`Expected Output ${index + 1}`}
                  fullWidth
                  multiline
                  rows={2}
                  value={test.output}
                  onChange={(e) => handleTestCaseChange(index, "output", e.target.value)}
                />
                {testCases.length > 1 && (
                  <IconButton
                    onClick={() => deleteTestCase(index)}
                    sx={{ position: "absolute", top: 8, right: 8 }}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </Paper>
            ))}
            <Button variant="outlined" sx={{ mt: 1 }} onClick={addTestCase}>
              ➕ Add Test Case
            </Button>
          </Box>

          <Button
            variant="contained"
            color="primary"
            sx={{ mt: 4, fontWeight: "bold", py: 1.5 }}
            fullWidth
            onClick={handleSubmit}
          >
            🚀 Submit Problem
          </Button>
        </Box>
      </motion.div>

      <Snackbar open={success} autoHideDuration={3000} onClose={() => setSuccess(false)}>
        <Alert severity="success" sx={{ width: "100%" }}>
          Problem created successfully!
        </Alert>
      </Snackbar>

      <Snackbar open={Boolean(error)} autoHideDuration={4000} onClose={() => setError("")}>
        <Alert severity="error" sx={{ width: "100%" }}>
          {error}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default CreateProblem;
