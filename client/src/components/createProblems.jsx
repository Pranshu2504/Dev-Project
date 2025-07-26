// SAME IMPORTS
import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  Paper,
  Snackbar,
  Alert,
  MenuItem,
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL;

const CreateProblem = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [testCases, setTestCases] = useState([{ input: "", expectedOutput: "" }]);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [errorSnackbar, setErrorSnackbar] = useState("");

  // 🔐 Admin Access Only
  useEffect(() => {
    axios
      .get(`${API}/api/auth/me`, { withCredentials: true })
      .then((res) => {
        if (res.data.user?.role !== "admin") {
          alert("You are not authorized.");
          navigate("/");
        }
      })
      .catch(() => navigate("/login"));
  }, []);

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
    setTestCases(updated);
  };

  const validateFields = () => {
    if (!title.trim() || !description.trim()) {
      setErrorSnackbar("Title and Description are required.");
      return false;
    }
    const valid = testCases.some(
      (tc) => tc.input.trim() && tc.expectedOutput.trim()
    );
    if (!valid) {
      setErrorSnackbar("At least one valid test case is required.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateFields()) return;

    const payload = {
      title: title.trim(),
      description: description.trim(),
      difficulty,
      testCases: testCases
        .filter((tc) => tc.input.trim() && tc.expectedOutput.trim())
        .map((tc) => ({
          input: tc.input.trim(),
          expectedOutput: tc.expectedOutput.trim(),
        })),
    };

    try {
      await axios.post(`${API}/api/problems`, payload, {
        withCredentials: true,
      });

      setOpenSnackbar(true);
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      console.error("❌ Error creating problem:", err.response?.data || err);
      setErrorSnackbar("Something went wrong. Please try again.");
    }
  };

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>
        🧠 Create New Problem
      </Typography>

      <TextField
        label="Title"
        fullWidth
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        margin="normal"
      />
      <TextField
        label="Description"
        fullWidth
        multiline
        rows={6}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        margin="normal"
      />
      <TextField
        label="Difficulty"
        fullWidth
        select
        value={difficulty}
        onChange={(e) => setDifficulty(e.target.value)}
        margin="normal"
      >
        {["Easy", "Medium", "Hard"].map((level) => (
          <MenuItem key={level} value={level}>
            {level}
          </MenuItem>
        ))}
      </TextField>

      <Typography variant="h6" mt={4}>
        Test Cases
      </Typography>

      {testCases.map((tc, index) => (
        <Paper key={index} sx={{ p: 2, mt: 2, position: "relative" }}>
          <TextField
            label={`Input ${index + 1}`}
            fullWidth
            multiline
            rows={2}
            value={tc.input}
            onChange={(e) =>
              handleTestCaseChange(index, "input", e.target.value)
            }
            margin="normal"
          />
          <TextField
            label={`Expected Output ${index + 1}`}
            fullWidth
            multiline
            rows={2}
            value={tc.expectedOutput}
            onChange={(e) =>
              handleTestCaseChange(index, "expectedOutput", e.target.value)
            }
            margin="normal"
          />
          <IconButton
            sx={{ position: "absolute", top: 8, right: 8 }}
            onClick={() => handleDeleteTestCase(index)}
          >
            <DeleteIcon />
          </IconButton>
        </Paper>
      ))}

      <Button
        variant="outlined"
        startIcon={<AddCircleIcon />}
        sx={{ mt: 2 }}
        onClick={handleAddTestCase}
      >
        Add Test Case
      </Button>

      <Box mt={4}>
        <Button variant="contained" color="primary" onClick={handleSubmit}>
          Submit Problem
        </Button>
      </Box>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={2500}
        onClose={() => setOpenSnackbar(false)}
      >
        <Alert severity="success" sx={{ width: "100%" }}>
          ✅ Problem created successfully!
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!errorSnackbar}
        autoHideDuration={3000}
        onClose={() => setErrorSnackbar("")}
      >
        <Alert severity="error" sx={{ width: "100%" }}>
          {errorSnackbar}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CreateProblem;
