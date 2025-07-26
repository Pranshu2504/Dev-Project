import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

function Navbar({ user, setUser }) {
  const location = useLocation();
  const currentPath = location.pathname;
  const navigate = useNavigate();

  const onLogout = () => {
    axios
      .post(
        "https://dev-project-hfmnznqja-pranshu-goels-projects.vercel.app/api/logout",
        {},
        { withCredentials: true }
      )
      .then(() => {
        setUser(null);
        navigate("/login");
      })
      .catch((err) => console.error(err));
  };

  return (
    <nav>
      {user ? (
        <>
          {currentPath !== "/" && <Link to="/">Home</Link>}
          {currentPath !== "/problems" && <Link to="/problems">Problems</Link>}
          {currentPath !== "/leaderboard" && <Link to="/leaderboard">Leaderboard</Link>}
          {currentPath !== "/submissions" && <Link to="/submissions">My Submissions</Link>}

          {/* ✅ Admin-only Add Problem button */}
          {user?.role === "admin" && (
            <Link to="/create-problem">Add Problem</Link>
          )}

          <button onClick={onLogout} className="logout-btn">Logout</button>
        </>
      ) : (
        <>
          {currentPath !== "/" && <Link to="/">Home</Link>}
          {currentPath !== "/login" && <Link to="/login">Login</Link>}
          {currentPath !== "/signup" && <Link to="/signup">Signup</Link>}
        </>
      )}
    </nav>
  );
}

export default Navbar;
