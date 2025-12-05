import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/components.css';

const Login = () => {
  const location = useLocation();
  const isAdmin = location.pathname === '/admin/login';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      // Validate role matches login type
      if (isAdmin && result.user.role !== 'admin') {
        setError('This is an admin login page. Please use student login.');
        setLoading(false);
        return;
      }
      if (!isAdmin && result.user.role === 'admin') {
        setError('Admins should use the admin login page.');
        setLoading(false);
        return;
      }

      const redirectPath = result.user.role === 'admin' 
        ? '/admin/dashboard' 
        : '/student/dashboard';
      navigate(redirectPath);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>ReflectED: Student Self-learning and Improvement Platform</h1>
        <h2>{isAdmin ? 'Admin Login' : 'Student Login'}</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="auth-footer">
          {!isAdmin && (
            <p>Don't have an account? <Link to="/register">Register</Link></p>
          )}
          {isAdmin && (
            <p>Student? <Link to="/login">Go to Student Login</Link></p>
          )}
          {!isAdmin && (
            <p style={{marginTop: '10px'}}>
              <Link to="/admin/login">Admin Login</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;