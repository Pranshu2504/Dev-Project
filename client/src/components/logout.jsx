import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Logout({ setUser }) {
  const navigate = useNavigate();
  const API = process.env.REACT_APP_API_URL;

  useEffect(() => {
    const logout = async () => {
      try {
        await fetch(`${API}/api/auth/logout`, {
          method: "GET",
          credentials: "include",
        });
        setUser(null);
        navigate("/");
      } catch (err) {
        console.error("Logout failed:", err);
      }
    };
    logout();
  }, [navigate, setUser, API]);

  return <p>Logging out...</p>;
}
