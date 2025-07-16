const express = require("express");
const router = express.Router();
const problemController = require("../controllers/problemController");
const { requireAdmin } = require("../middleware/authMiddleware");



// Routes for problems
router.get("/", problemController.listProblems);
router.get("/:id", problemController.getProblem);
router.post("/", problemController.createProblem);
router.put("/:id", requireAdmin, problemController.editProblem);
router.delete("/:id", requireAdmin, problemController.deleteProblem);
// Submit (runs against all test cases)
router.post("/:id/submit", problemController.submitProblem);

// Run (runs only first 3 + optional custom input)
router.post("/:id/run", problemController.runProblem);

module.exports = router;
