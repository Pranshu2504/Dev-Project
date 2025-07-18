import React, { useEffect, useState, useContext } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  AppBar,
  Toolbar,
  CssBaseline,
  CircularProgress,
  createTheme,
  ThemeProvider,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { DarkModeContext } from "../context/DarkMode";

const API = process.env.REACT_APP_API_URL;

function ProblemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [user, setUser] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openSuccessSnackbar, setOpenSuccessSnackbar] = useState(false);
  const [openErrorSnackbar, setOpenErrorSnackbar] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { darkMode, toggleDarkMode } = useContext(DarkModeContext);

  const theme = createTheme({
    palette: { mode: darkMode ? "dark" : "light" },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [problemRes, userRes] = await Promise.all([
          axios.get(`${API}/api/problems/${id}`),
          axios.get(`${API}/api/auth/me`, { withCredentials: true }),
        ]);

        const loggedInUser = userRes.data.user;
        setProblem(problemRes.data);
        setUser(loggedInUser);
      } catch (err) {
        console.error("❌ Error fetching data:", err);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleDeleteConfirm = async () => {
    try {
      await axios.delete(`${API}/api/problems/${id}`, {
        withCredentials: true,
      });
      setConfirmOpen(false);
      setOpenSuccessSnackbar(true);
      setTimeout(() => {
        navigate("/"); // Redirect to home
      }, 1500);
    } catch (err) {
      console.error("❌ Delete failed:", err);
      setConfirmOpen(false);
      setOpenErrorSnackbar(true);
    }
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box mt={10} display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  if (!problem) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box mt={10} textAlign="center">
          <Typography variant="h6" color="error">
            Problem not found!
          </Typography>
          <Button variant="contained" onClick={() => navigate("/")}>
            Go Back
          </Button>
        </Box>
      </ThemeProvider>
    );
  }

  const userIsAdmin = user?.role === "admin";

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: "bold" }}>
            🧩 Problem Details
          </Typography>
          <IconButton onClick={toggleDarkMode} color="inherit" sx={{ mr: 1 }}>
            {darkMode ? "🌙" : "🌞"}
          </IconButton>
          {user && <Typography sx={{ mr: 2 }}>{user.email}</Typography>}
          <Button color="inherit" onClick={() => navigate("/")}>
            🏠 Home
          </Button>
          <IconButton onClick={handleMenuOpen} color="inherit">
            <Avatar sx={{ width: 32, height: 32 }}>
              {user?.email?.[0]?.toUpperCase() || "U"}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem
              onClick={() => {
                axios
                  .get(`${API}/api/auth/logout`, { withCredentials: true })
                  .then(() => navigate("/login"));
              }}
            >
              🚪 Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component={Paper}
        elevation={4}
        sx={{
          maxWidth: 800,
          mx: "auto",
          mt: 6,
          p: 4,
          borderRadius: 3,
          backgroundColor: "background.paper",
        }}
      >
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {problem.title}
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          <strong>Difficulty:</strong> {problem.difficulty}
        </Typography>

        <Box mt={3}>
          <Button
            variant="contained"
            color="primary"
            sx={{ mr: 2 }}
            onClick={() => navigate(`/solve/${id}`)}
          >
            🧪 Solve
          </Button>

          {userIsAdmin && (
            <>
              <Button
                variant="outlined"
                sx={{ mr: 2 }}
                onClick={() => navigate(`/edit-problem/${id}`)}
              >
                ✏️ Edit
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => setConfirmOpen(true)}
              >
                ❌ Delete
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* ✅ Confirmation Dialog */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this problem? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ Success Snackbar */}
      <Snackbar
        open={openSuccessSnackbar}
        autoHideDuration={2000}
        onClose={() => setOpenSuccessSnackbar(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" sx={{ width: "100%" }}>
          Problem deleted successfully!
        </Alert>
      </Snackbar>

      {/* ❌ Error Snackbar */}
      <Snackbar
        open={openErrorSnackbar}
        autoHideDuration={3000}
        onClose={() => setOpenErrorSnackbar(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" sx={{ width: "100%" }}>
          Failed to delete the problem!
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default ProblemDetails;
