import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Logout({ setUser }) {
  const navigate = useNavigate();

  useEffect(() => {
    const logout = async () => {
      try {
        await fetch("http://localhost:5000/api/auth/logout", {
          method: "GET", // ✅ fix here
          credentials: "include",
        });
        setUser(null);
        navigate("/");
      } catch (err) {
        console.error("Logout failed:", err);
      }
    };
    logout();
  }, [navigate, setUser]);

  return <p>Logging out...</p>;
}
