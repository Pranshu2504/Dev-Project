import React, { useState, useContext } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CssBaseline,
  Alert,
  CircularProgress,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  createTheme,
  ThemeProvider,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { DarkModeContext } from "../context/DarkMode";

function Signup({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

  const { darkMode, toggleDarkMode } = useContext(DarkModeContext);

  const theme = createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
    },
  });

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({ email: "", password: "" });
    setGeneralError("");
    setLoading(true);

    try {
      const res = await axios.post(
        
        `${process.env.REACT_APP_API_URL}/api/auth/signup`,
        { email, password },
        { withCredentials: true }
      );
      setUser(res.data.user);
      navigate("/");
      console.log("API URL:", process.env.REACT_APP_API_URL);

    } catch (err) {
      setLoading(false);
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setGeneralError("Signup failed. Please try again.");
      }
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: "bold" }}>
            🔐 Sign Up
          </Typography>
          <IconButton onClick={toggleDarkMode} color="inherit" sx={{ mr: 1 }}>
            {darkMode ? "🌙" : "🌞"}
          </IconButton>
          <Button color="inherit" onClick={() => navigate("/")}>🏠 Home</Button>
          <IconButton onClick={handleMenuOpen} color="inherit">
            <Avatar sx={{ width: 32, height: 32 }}>U</Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
            <MenuItem onClick={() => navigate("/login")}>🚪 Login</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component={Paper}
        elevation={4}
        sx={{
          maxWidth: 400,
          mx: "auto",
          mt: 8,
          p: 4,
          borderRadius: 3,
        }}
      >
        <Typography variant="h5" fontWeight="bold" align="center" gutterBottom>
          Create Your Account
        </Typography>

        {generalError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {generalError}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <TextField
            label="Email"
            type="email"
            fullWidth
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={Boolean(errors.email)}
            helperText={errors.email}
            margin="normal"
          />

          <TextField
            label="Password"
            type="password"
            fullWidth
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={Boolean(errors.password)}
            helperText={errors.password || "Minimum 6 characters"}
            margin="normal"
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            sx={{ mt: 2, py: 1.5 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Sign Up"}
          </Button>
        </form>

        <Typography align="center" sx={{ mt: 3 }}>
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            style={{
              color: theme.palette.primary.main,
              cursor: "pointer",
              fontWeight: "bold",
              textDecoration: "underline",
            }}
          >
            Sign In
          </span>
        </Typography>
      </Box>
    </ThemeProvider>
  );
}

export default Signup;
