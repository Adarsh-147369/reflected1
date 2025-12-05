import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isStudent = user?.role === 'student';
  const isAdmin = user?.role === 'admin';

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h2>ReflectED</h2>
        </div>

        <div className="navbar-menu">
          {isStudent && (
            <>
              <Link to="/student/dashboard">Dashboard</Link>
              <Link to="/student/subjects">Subjects</Link>
              <Link to="/student/resources">Resources</Link>
              <Link to="/student/improvement">Progress</Link>
            </>
          )}

          {isAdmin && (
            <>
              <Link to="/admin/dashboard">Dashboard</Link>
            </>
          )}
        </div>

        <div className="navbar-user">
          <span>{user?.full_name}</span>
          <button onClick={handleLogout} className="btn-secondary">Logout</button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;