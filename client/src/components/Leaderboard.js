import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
} from "@mui/material";
import axios from "axios";

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/leaderboard");
        setLeaders(res.data);
      } catch (err) {
        console.error("Error loading leaderboard", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>🏆 Leaderboard</Typography>
      {loading ? (
        <CircularProgress />
      ) : leaders.length === 0 ? (
        <Typography>No data yet.</Typography>
      ) : (
        <Paper elevation={3}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Rank</strong></TableCell>
                <TableCell><strong>User ID</strong></TableCell>
                <TableCell><strong>Passed</strong></TableCell>
                <TableCell><strong>Total</strong></TableCell>
                <TableCell><strong>Accuracy (%)</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaders.map((user, i) => (
                <TableRow key={user.userId}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{user.userId}</TableCell>
                  <TableCell>{user.passed}</TableCell>
                  <TableCell>{user.total}</TableCell>
                  <TableCell>{((user.passed / user.total) * 100).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}
