// src/App.js
import React, { useEffect, useState, useContext } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import axios from "axios";
import "./App.css";

import {
  ThemeProvider,
  createTheme,
  CssBaseline
} from "@mui/material";

import { DarkModeProvider, DarkModeContext } from "./context/DarkMode";

import Signup from "./components/signup";
import Login from "./components/login";
import Problems from "./components/problems";
import ProblemDetails from "./components/problemDetails";
import CreateProblem from "./components/createProblems";
import EditProblem from "./components/EditProblem";
import SolveProblem from "./components/solveProblems";
import Home from "./components/home";

function AppContent() {
  const { darkMode } = useContext(DarkModeContext);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const theme = createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
    },
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/auth/me", {
          withCredentials: true,
        });
        setUser(res.data.user);
      } catch (err) {
        console.error("Error fetching user:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/signup" element={<Signup setUser={setUser} />} />
          <Route path="/problems" element={<Problems user={user} />} />
          <Route path="/solve/:id" element={<SolveProblem />} />
          <Route path="/problems/:id" element={<ProblemDetails />} />
          <Route path="/create-problem" element={<CreateProblem />} />
          <Route path="/edit-problem/:id" element={<EditProblem />} />
          
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

function App() {
  return (
    <DarkModeProvider>
      <AppContent />
    </DarkModeProvider>
  );
}

export default App;
