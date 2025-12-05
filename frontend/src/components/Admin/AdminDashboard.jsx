import React, { useState, useEffect } from 'react';
import Navbar from '../Common/Navbar';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../utils/api';
import StudentProgressModal from './StudentProgressModal';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [statistics, setStatistics] = useState([]);
  const [improvementData, setImprovementData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [showProgressModal, setShowProgressModal] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [usersRes, statsRes, improvementRes, subjectsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/statistics'),
        api.get('/admin/improvement'),
        api.get('/questions/subjects')
      ]);

      setUsers(usersRes.data.users);
      setStatistics(statsRes.data.statistics);
      setImprovementData(improvementRes.data.user_performance || improvementRes.data.improvement_tracking || []);
      
      // Set all subjects for display
      if (subjectsRes.data.subjects) {
        const subjectsByStream = {};
        subjectsRes.data.subjects.forEach(subject => {
          if (!subjectsByStream[subject.stream]) {
            subjectsByStream[subject.stream] = [];
          }
          subjectsByStream[subject.stream].push(subject);
        });
        // Store subjects grouped by stream if needed
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProgress = (userId) => {
    setSelectedStudentId(userId);
    setShowProgressModal(true);
  };

  const handleCloseModal = () => {
    setShowProgressModal(false);
    setSelectedStudentId(null);
  };

  const handleDeleteStudent = async (userId, userName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${userName}? This will remove all their exams and progress data. This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/admin/students/${userId}`);
      alert('Student deleted successfully');
      fetchAdminData(); // Refresh data
    } catch (error) {
      console.error('Error deleting student:', error);
      alert(error.response?.data?.error || 'Failed to delete student');
    }
  };

  return (
    <div>
      <Navbar />
      <div className="dashboard-container">
        <h1>Admin Dashboard</h1>

        {loading ? (
          <p>Loading data...</p>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>{users.length}</h3>
                <p>Total Students</p>
              </div>
              <div className="stat-card">
                <h3>{statistics.length}</h3>
                <p>Total Subjects</p>
              </div>
              <div className="stat-card">
                <h3>{improvementData.reduce((sum, u) => sum + (u.total_exams || 0), 0)}</h3>
                <p>Total Exams</p>
              </div>
              <div className="stat-card">
                <h3>{statistics.reduce((sum, s) => sum + (parseInt(s.students_attempted) || 0), 0)}</h3>
                <p>Total Exam Attempts</p>
              </div>
            </div>

            <div className="chart-container">
              <h3>Subject-wise Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statistics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject_name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avg_score" fill="#8884d8" name="Average Score" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="table-container">
              <h3>Student Performance Overview</h3>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Stream</th>
                    <th>Total Exams</th>
                    <th>Avg Score</th>
                    <th>Best Score</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {improvementData.map((user) => {
                    const avgScore = user.avg_score != null ? parseFloat(user.avg_score) : null;
                    const bestScore = user.best_score != null ? parseFloat(user.best_score) : null;
                    return (
                      <tr key={user.id}>
                        <td>{user.full_name}</td>
                        <td>{user.email}</td>
                        <td>{user.stream}</td>
                        <td>{user.total_exams || 0}</td>
                        <td>{avgScore != null ? avgScore.toFixed(2) + '%' : 'N/A'}</td>
                        <td>{bestScore != null ? bestScore.toFixed(2) + '%' : 'N/A'}</td>
                        <td>
                          <button
                            className="btn-view-progress"
                            onClick={() => handleViewProgress(user.id)}
                          >
                            View Progress
                          </button>
                          <button
                            className="btn-delete-student"
                            onClick={() => handleDeleteStudent(user.id, user.full_name)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {showProgressModal && selectedStudentId && (
          <StudentProgressModal
            studentId={selectedStudentId}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;