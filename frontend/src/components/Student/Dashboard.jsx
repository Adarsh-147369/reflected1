import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../Common/Navbar';
import api from '../../utils/api';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [examHistory, setExamHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExamHistory();
  }, []);

  const fetchExamHistory = async () => {
    try {
      const response = await api.get('/exams/history');
      setExamHistory(response.data.exams);
    } catch (error) {
      console.error('Error fetching exam history:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="dashboard-container">
        <h1>Welcome, {user?.full_name}!</h1>
        <p className="stream-badge">Stream: {user?.stream}</p>

        <div className="dashboard-cards">
          <div className="card" onClick={() => navigate('/student/subjects')}>
            <h3>📝 Take Exam</h3>
            <p>Start a new exam for your subjects</p>
          </div>

          <div className="card" onClick={() => navigate('/student/resources')}>
            <h3>📚 Learning Resources</h3>
            <p>Access personalized study materials</p>
          </div>

          <div className="card" onClick={() => navigate('/student/improvement')}>
            <h3>📊 Track Progress</h3>
            <p>View your improvement analytics</p>
          </div>
        </div>

        <div className="exam-history">
          <h2>Recent Exams</h2>
          {loading ? (
            <p>Loading...</p>
          ) : examHistory.length === 0 ? (
            <p>No exams taken yet. Start your first exam!</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {examHistory.map((exam) => {
                  const percentage = exam.percentage != null ? parseFloat(exam.percentage) : 0;
                  return (
                    <tr key={exam.id}>
                      <td>{exam.subject_name}</td>
                      <td>{exam.completed_at ? new Date(exam.completed_at).toLocaleDateString() : 'N/A'}</td>
                      <td>{exam.total_score != null ? exam.total_score : 0}/20</td>
                      <td>{percentage.toFixed(2)}%</td>
                      <td>
                        <span className={`badge ${exam.auto_submitted ? 'badge-warning' : 'badge-success'}`}>
                          {exam.auto_submitted ? 'Auto-Submitted' : 'Completed'}
                        </span>
                      </td>
                      <td>
                        <button 
                          onClick={() => navigate(`/student/evaluation/${exam.id}`)}
                          className="btn btn-sm btn-primary"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;