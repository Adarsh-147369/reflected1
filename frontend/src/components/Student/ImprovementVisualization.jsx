import React, { useState, useEffect } from 'react';
import Navbar from '../Common/Navbar';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../utils/api';

const ImprovementVisualization = () => {
  const [improvementData, setImprovementData] = useState([]);
  const [examHistory, setExamHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImprovementData();
  }, []);

  const fetchImprovementData = async () => {
    try {
      const response = await api.get('/progress/improvement');
      setImprovementData(response.data.improvement_tracking);

      // Process exam history for charts
      const history = response.data.exam_history.map((exam, index) => ({
        attempt: index + 1,
        score: exam.total_score != null ? parseFloat(exam.total_score) || 0 : 0,
        percentage: exam.percentage != null ? parseFloat(exam.percentage) || 0 : 0,
        subject: exam.subject_name || 'Unknown',
        date: exam.completed_at ? new Date(exam.completed_at).toLocaleDateString() : 'N/A'
      }));
      setExamHistory(history);
    } catch (error) {
      console.error('Error fetching improvement data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="dashboard-container">
        <h1>Progress & Improvement Tracking</h1>

        {loading ? (
          <p>Loading data...</p>
        ) : examHistory.length === 0 ? (
          <div className="no-data">
            <h3>No exam data available yet</h3>
            <p>Take some exams to see your progress visualization!</p>
          </div>
        ) : (
          <>
            <div className="chart-container">
              <h3>Score Progression</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={examHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="attempt" label={{ value: 'Attempt Number', position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: 'Score', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="score" stroke="#8884d8" name="Score (out of 20)" />
                  <Line type="monotone" dataKey="percentage" stroke="#82ca9d" name="Percentage" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-container">
              <h3>Subject-wise Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={improvementData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject_name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="initial_score" fill="#8884d8" name="Initial Score" />
                  <Bar dataKey="current_score" fill="#82ca9d" name="Current Score" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="improvement-cards">
              {improvementData.map((item) => {
                const initialScore = item.initial_score != null ? parseFloat(item.initial_score) : 0;
                const currentScore = item.current_score != null ? parseFloat(item.current_score) : 0;
                const improvement = item.improvement_percentage != null ? parseFloat(item.improvement_percentage) : 0;
                return (
                  <div key={item.subject_name} className="improvement-card">
                    <h4>{item.subject_name}</h4>
                    <div className="score-comparison">
                      <div>
                        <span>Initial:</span>
                        <strong>{initialScore.toFixed(2)}%</strong>
                      </div>
                      <div>
                        <span>Current:</span>
                        <strong>{currentScore.toFixed(2)}%</strong>
                      </div>
                    </div>
                    <div className={`improvement-badge ${improvement >= 0 ? 'positive' : 'negative'}`}>
                      {improvement >= 0 ? '↑' : '↓'} {Math.abs(improvement).toFixed(2)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ImprovementVisualization;