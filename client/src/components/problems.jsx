import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";


function Problems({ user }) {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/problems");
        setProblems(res.data);
      } catch (err) {
        console.error("Error fetching problems", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProblems();
  }, []);

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete Problem",
      text: "Are you sure you want to delete this problem?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it",
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`http://localhost:5000/api/problems/${id}`, { withCredentials: true });
        setProblems(problems.filter((p) => p._id !== id));
        Swal.fire("Deleted!", "The problem has been deleted.", "success");
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to delete problem.", "error");
      }
    }
  };

  if (loading) return <p className="loading">Loading problems...</p>;

  return (
    <div className="problem-list-container">
      <h2 className="problem-list-heading">Problems</h2>
      {problems.length === 0 && <p className="home-message">No problems found.</p>}
      {problems.map((problem) => (
        <div key={problem._id} className="problem-card">
          <div className="problem-title">{problem.title}</div>
          <div className="problem-description">{problem.description}</div>
          <div className="button-group">
            <button className="btn" onClick={() => navigate(`/problems/${problem._id}`)}>View</button>
            <button className="btn" onClick={() => navigate(`/solve/${problem._id}`)}>Solve</button>
            {user?.role === "admin" && (
              <>
                <button className="btn" onClick={() => navigate(`/edit-problem/${problem._id}`)}>Edit</button>
                <button className="btn btn-delete" onClick={() => handleDelete(problem._id)}>Delete</button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default Problems;
