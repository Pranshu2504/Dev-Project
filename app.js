const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { GridFSBucket } = require("mongodb");

const authRoutes = require("./routes/authRoutes");
const problemRoutes = require("./routes/problemRoutes");
const submissionRoutes = require("./routes/submissionRoutes");
const { initializeGridFS } = require("./controllers/problemController");

// Load .env only in development
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const app = express();
app.set("trust proxy", 1);

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "https://dev-project-aj2v4vtls-pranshu-goels-projects.vercel.app",
    credentials: true,
  })
);

// MongoDB connect
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ MongoDB connected");
    
    const db = mongoose.connection.db;
    const gfs = new GridFSBucket(db, { bucketName: "problem_data" });

    // Inject gfs into app locals
    app.locals.gfs = gfs;

    // Pass gfs to routes via middleware
    app.use((req, res, next) => {
      req.gfs = gfs;
      next();
    });

    // Initialize GridFS in problem controller
    try {
      await initializeGridFS();
      console.log("✅ GridFS initialized in problem controller");
    } catch (error) {
      console.error("❌ GridFS initialization failed:", error);
    }

    // Routes
    app.use("/api/auth", authRoutes);
    app.use("/api/problems", problemRoutes);
    app.use("/api/submissions", submissionRoutes);

    app.use((req, res, next) => {
      if (!req.path.startsWith("/api")) {
        return res.status(404).send("Not found");
      }
      next();
    });

    app.listen(5000, () => console.log("✅ Server running on port 5000"));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });