const express = require("express");
const router = express.Router();
const problemController = require("../controllers/problemController");
const { requireAdmin } = require("../middleware/authMiddleware");

// Public Routes
router.get("/", problemController.listProblems);
router.get("/:id", problemController.getProblem);

// Admin-only Routes
router.post("/", requireAdmin, problemController.createProblem);
router.put("/:id", requireAdmin, problemController.editProblem);
router.delete("/:id", requireAdmin, problemController.deleteProblem);

// Submission & Run
router.post("/:id/submit", problemController.submitProblem);  // all test cases
router.post("/:id/run", problemController.runProblem);        // 3 samples + custom input

module.exports = router;
