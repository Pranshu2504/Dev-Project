// routes/submissionRoutes.js
const express = require("express");
const router = express.Router();
const submissionController = require("../controllers/SubmissionController");
const { requireAuth } = require("../middleware/authMiddleware");
// optional if auth

router.post("/", requireAuth, submissionController.createSubmission); // ✅ CORRECT
router.get("/history", requireAuth, submissionController.getSubmissionHistory);
router.get("/leaderboard", submissionController.getLeaderboard);

module.exports = router;