import React, { useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = process.env.REACT_APP_API_URL;

const Login = ({ setUser }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      await axios.post(
        `${API}/api/auth/login`,
        { email, password },
        { withCredentials: true }
      );

      const userRes = await axios.get(`${API}/api/auth/me`, {
        withCredentials: true,
      });

      setUser(userRes.data.user);
      navigate("/");
    } catch (err) {
      setLoading(false);
      const apiErrors = err.response?.data?.errors;
      if (apiErrors) {
        setErrors(apiErrors);
      } else {
        setErrors({
          password: "Login failed. Please check your credentials.",
        });
      }
    }
  };

  return (
    <>
      {/* AppBar */}
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: "bold" }}>
            Login
          </Typography>
          <Button color="inherit" onClick={() => navigate("/")}>
            🏠 Home
          </Button>
          <IconButton onClick={handleMenuOpen} color="inherit">
            <Avatar>U</Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
            <MenuItem onClick={() => navigate("/login")}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Login Form */}
      <Container maxWidth="xs">
        <Box mt={8} display="flex" flexDirection="column" alignItems="center">
          <Typography variant="h5">Login</Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <TextField
              fullWidth
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={!!errors.email}
              helperText={errors.email}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!errors.password}
              helperText={errors.password}
              margin="normal"
            />
            <Box mt={2}>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : "Login"}
              </Button>
            </Box>
          </Box>

          {/* Signup Link */}
          <Box mt={2}>
            <Typography variant="body2">
              Don&apos;t have an account?{" "}
              <Button variant="text" onClick={() => navigate("/signup")}>
                Register
              </Button>
            </Typography>
          </Box>
        </Box>
      </Container>
    </>
  );
};

export default Login;
