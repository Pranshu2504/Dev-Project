const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Helper: Get token from either custom jwt or _vercel_jwt
const getTokenFromCookies = (req) => {
  return req.cookies.jwt || req.cookies._vercel_jwt;
};

// Require any logged-in user
const requireAuth = (req, res, next) => {
  const token = getTokenFromCookies(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, "PranshuOnlineJudge");
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    console.error("JWT verification error (requireAuth):", err.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

// Require admin role
const requireAdmin = (req, res, next) => {
  const token = getTokenFromCookies(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, "PranshuOnlineJudge");
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Access denied: Admins only." });
    }
    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT verification error (requireAdmin):", err.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

// Optionally attach the current user
const checkUser = async (req, res, next) => {
  const token = getTokenFromCookies(req);
  if (!token) {
    res.locals.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, "PranshuOnlineJudge");
    const user = await User.findById(decoded.id).select("-password");
    res.locals.user = user;
    next();
  } catch (err) {
    console.error("JWT verification error (checkUser):", err.message);
    res.locals.user = null;
    next();
  }
};

module.exports = { requireAuth, requireAdmin, checkUser };
