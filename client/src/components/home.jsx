import React, { useEffect, useState, useContext } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  TextField,
  InputAdornment,
  Chip,
  Divider,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Button,
  CssBaseline,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";
import { DarkModeContext } from "../context/DarkMode";

function Home({ user }) {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const API = process.env.REACT_APP_API_URL;

  const { darkMode, toggleDarkMode } = useContext(DarkModeContext);

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const res = await axios.get(`${API}/api/problems`);
        setProblems(res.data);
      } catch (err) {
        console.error("Error fetching problems:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProblems();
  }, [API]);

  const filteredProblems = problems.filter((problem) =>
    problem.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDifficultyColor = (level) => {
    switch (level.toLowerCase()) {
      case "easy":
        return "success";
      case "medium":
        return "warning";
      case "hard":
        return "error";
      default:
        return "default";
    }
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await axios.get(`${API}/api/auth/logout`, { withCredentials: true });
    window.location.reload();
  };

  return (
    <>
      <CssBaseline />
      <AppBar position="static" color="primary" enableColorOnDark>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: "bold" }}>
            🧠 Code Arena
          </Typography>

          {/* Dark Mode Toggle */}
          <IconButton onClick={toggleDarkMode} color="inherit" sx={{ mr: 1 }}>
            {darkMode ? "🌙" : "🌞"}
          </IconButton>

          {user ? (
            <>
              {currentPath !== "/" && (
                <Button color="inherit" component={Link} to="/">
                  Home
                </Button>
              )}

              {user.role === "admin" && (
                <Button color="inherit" onClick={() => navigate("/create-problem")}>
                  + Add Problem
                </Button>
              )}

              <IconButton onClick={handleMenuOpen} color="inherit">
                <Avatar sx={{ width: 32, height: 32 }}>
                  {user.username?.[0]?.toUpperCase() || "U"}
                </Avatar>
              </IconButton>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </>
          ) : (
            <>
              {currentPath !== "/login" && (
                <Button color="inherit" component={Link} to="/login">
                  Login
                </Button>
              )}
              {currentPath !== "/signup" && (
                <Button color="inherit" component={Link} to="/signup">
                  Signup
                </Button>
              )}
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ p: 4, bgcolor: "background.default", minHeight: "100vh" }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: "bold", color: "primary.main", mb: 1 }}>
            🧠 Explore Coding Challenges
          </Typography>
          <Divider sx={{ mb: 3, bgcolor: "primary.main" }} />
          <TextField
            fullWidth
            variant="outlined"
            placeholder="🔍 Search problems by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="primary" />
                </InputAdornment>
              ),
            }}
            sx={{ backgroundColor: "background.paper", borderRadius: 1, boxShadow: 1 }}
          />
        </Box>

        {loading ? (
          <CircularProgress />
        ) : (
          <Box sx={{ maxHeight: 500, overflowY: "auto", borderRadius: 2, boxShadow: 2 }}>
            <TableContainer component={Paper}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: "#000", fontWeight: "bold", fontSize: "16px" }}>
                      Problem Title
                    </TableCell>
                    <TableCell sx={{ color: "#000", fontWeight: "bold", fontSize: "16px" }}>
                      Difficulty
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredProblems.map((problem, index) => (
                    <TableRow
                      key={problem._id}
                      hover
                      sx={{
                        cursor: "pointer",
                        transition: "background 0.2s ease-in-out",
                        bgcolor: index % 2 === 0 ? "background.paper" : "action.hover",
                        "&:hover": { backgroundColor: "action.selected" },
                      }}
                      onClick={() => navigate(`/problems/${problem._id}`)}
                    >
                      <TableCell>
                        <Typography variant="subtitle1" fontWeight="500" color="primary.main">
                          {problem.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={problem.difficulty}
                          color={getDifficultyColor(problem.difficulty)}
                          variant="outlined"
                          size="small"
                          sx={{ fontWeight: "bold" }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>
    </>
  );
}

export default Home;
