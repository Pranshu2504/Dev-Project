const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");
const problemRoutes = require("./routes/problemRoutes");
const submissionRoutes = require("./routes/submissionRoutes");

// Load .env only in development (Render injects env automatically)
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "https://dev-project-hfmnznqja-pranshu-goels-projects.vercel.app",
    credentials: true,
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/submissions", submissionRoutes);

// ⛔ Catch-all for unknown non-API routes (prevents /manifest.json 401)
app.use((req, res, next) => {
  if (!req.path.startsWith("/api")) {
    return res.status(404).send("Not found");
  }
  next();
});

// Connect to MongoDB and start server
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    app.listen(5000, () => {
      console.log("✅ Server running on port 5000");
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });
