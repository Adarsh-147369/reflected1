import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import '../../styles/StudentProgressModal.css';

const StudentProgressModal = ({ studentId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [deletingExamId, setDeletingExamId] = useState(null);

  useEffect(() => {
    fetchStudentProgress();
  }, [studentId]);

  const fetchStudentProgress = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/students/${studentId}/progress`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching student progress:', error);
      alert(error.response?.data?.error || 'Failed to fetch student progress');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async (examId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this exam? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      setDeletingExamId(examId);
      await api.delete(`/admin/exams/${examId}`);
      alert('Exam deleted successfully');
      // Refresh data
      await fetchStudentProgress();
    } catch (error) {
      console.error('Error deleting exam:', error);
      alert(error.response?.data?.error || 'Failed to delete exam');
    } finally {
      setDeletingExamId(null);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target.className === 'modal-backdrop') {
      onClose();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="modal-backdrop" onClick={handleBackdropClick}>
        <div className="modal-container">
          <div className="modal-loading">Loading student progress...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { student, exams, resources, improvement } = data;

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-container">
        <div className="modal-header">
          <h2>Student Progress Details</h2>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-content">
          {/* Student Info Section */}
          <div className="student-info-section">
            <h3>Student Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Name:</span>
                <span className="info-value">{student.full_name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email:</span>
                <span className="info-value">{student.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Stream:</span>
                <span className="info-value">{student.stream}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Registered:</span>
                <span className="info-value">{formatDate(student.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Exam History Section */}
          <div className="exam-history-section">
            <h3>Exam History ({exams.length} exams)</h3>
            {exams.length === 0 ? (
              <p className="no-data">No exams taken yet</p>
            ) : (
              <div className="table-wrapper">
                <table className="exam-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Date</th>
                      <th>MCQ Score</th>
                      <th>Descriptive Score</th>
                      <th>Total Score</th>
                      <th>Percentage</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map((exam) => (
                      <tr key={exam.id}>
                        <td>{exam.subject_name}</td>
                        <td>{formatDate(exam.completed_at)}</td>
                        <td>{exam.mcq_score}/8</td>
                        <td>{parseFloat(exam.descriptive_score || 0).toFixed(2)}/12</td>
                        <td>{parseFloat(exam.total_score || 0).toFixed(2)}/20</td>
                        <td>{parseFloat(exam.percentage || 0).toFixed(2)}%</td>
                        <td>
                          {exam.auto_submitted ? (
                            <span className="status-badge status-auto">Auto-submitted</span>
                          ) : (
                            <span className="status-badge status-completed">Completed</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn-delete-exam"
                            onClick={() => handleDeleteExam(exam.id)}
                            disabled={deletingExamId === exam.id}
                          >
                            {deletingExamId === exam.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Resource Progress Section */}
          <div className="resource-progress-section">
            <h3>Resource Completion Progress</h3>
            {resources.length === 0 ? (
              <p className="no-data">No resources assigned yet</p>
            ) : (
              <div className="resource-list">
                {resources.map((resource, index) => (
                  <div key={index} className="resource-item">
                    <div className="resource-header">
                      <span className="resource-subject">{resource.subject_name}</span>
                      <span className="resource-stats">
                        {resource.completed_resources}/{resource.total_resources} completed
                      </span>
                    </div>
                    <div className="progress-bar-container">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${resource.completion_percentage || 0}%` }}
                      >
                        <span className="progress-text">
                          {parseFloat(resource.completion_percentage || 0).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Improvement Metrics Section */}
          <div className="improvement-section">
            <h3>Improvement Metrics</h3>
            {improvement.length === 0 ? (
              <p className="no-data">No improvement data available yet</p>
            ) : (
              <div className="improvement-list">
                {improvement.map((metric, index) => {
                  const improvementValue = parseFloat(metric.improvement_percentage || 0);
                  const isPositive = improvementValue > 0;
                  const isNegative = improvementValue < 0;

                  return (
                    <div key={index} className="improvement-item">
                      <div className="improvement-subject">{metric.subject_name}</div>
                      <div className="improvement-scores">
                        <div className="score-box">
                          <span className="score-label">Initial</span>
                          <span className="score-value">
                            {parseFloat(metric.initial_score || 0).toFixed(2)}%
                          </span>
                        </div>
                        <div className="score-arrow">→</div>
                        <div className="score-box">
                          <span className="score-label">Current</span>
                          <span className="score-value">
                            {parseFloat(metric.current_score || 0).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                      <div
                        className={`improvement-badge ${
                          isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'
                        }`}
                      >
                        {isPositive && '↑ '}
                        {isNegative && '↓ '}
                        {Math.abs(improvementValue).toFixed(2)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentProgressModal;
