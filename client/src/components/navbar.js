import React from "react";
import { Link, useLocation } from "react-router-dom";

const Navbar = ({ user, onLogout }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav className="navbar">
      <h3>🧠 Code Arena</h3>
      <div className="nav-links">
        {user ? (
          <>
            {currentPath !== "/" && <Link to="/">Home</Link>}
            {currentPath !== "/problems" && <Link to="/problems">Problems</Link>}
            {currentPath !== "/leaderboard" && <Link to="/leaderboard">Leaderboard</Link>}
            {currentPath !== "/submissions" && <Link to="/submissions">My Submissions</Link>}
            <button onClick={onLogout} className="logout-btn">Logout</button>
          </>
        ) : (
          <>
            {currentPath !== "/" && <Link to="/">Home</Link>}
            {currentPath !== "/login" && <Link to="/login">Login</Link>}
            {currentPath !== "/signup" && <Link to="/signup">Signup</Link>}
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
