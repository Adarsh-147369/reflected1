import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Common/Navbar';
import api from '../../utils/api';

const LearningResources = () => {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubjectsWithExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSubjectsWithExams = async () => {
    try {
      const response = await api.get('/exams/history');
      const exams = response.data.exams || [];
      
      // Group by subject
      const subjectMap = {};
      exams.forEach(exam => {
        if (!subjectMap[exam.subject_id]) {
          subjectMap[exam.subject_id] = {
            subject_id: exam.subject_id,
            subject_name: exam.subject_name,
            stream: exam.stream,
            latest_exam: exam,
            latest_percentage: exam.percentage
          };
        } else if (new Date(exam.completed_at) > new Date(subjectMap[exam.subject_id].latest_exam.completed_at)) {
          subjectMap[exam.subject_id].latest_exam = exam;
          subjectMap[exam.subject_id].latest_percentage = exam.percentage;
        }
      });

      setSubjects(Object.values(subjectMap));
      if (Object.values(subjectMap).length > 0) {
        setSelectedSubject(Object.values(subjectMap)[0].subject_id);
        fetchResources(Object.values(subjectMap)[0].subject_id);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async (subjectId) => {
    try {
      setLoading(true);
      const response = await api.get(`/resources/subject/${subjectId}`);
      setResources(response.data.resources || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectChange = (subjectId) => {
    setSelectedSubject(subjectId);
    fetchResources(subjectId);
  };

  const handleResourceClick = async (resourceId, url) => {
    // Track progress when resource is clicked
    try {
      await api.put(`/resources/progress/${resourceId}`, {
        progress_percentage: 0,
        completed: false
      });
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error tracking progress:', error);
      window.open(url, '_blank');
    }
  };

  const markAsCompleted = async (resourceId) => {
    try {
      await api.put(`/resources/progress/${resourceId}`, {
        progress_percentage: 100,
        completed: true
      });
      // Refresh resources
      fetchResources(selectedSubject);
      alert('Resource marked as completed!');
    } catch (error) {
      console.error('Error marking complete:', error);
    }
  };

  const getSubjectInfo = () => {
    return subjects.find(s => s.subject_id === selectedSubject);
  };

  if (loading && subjects.length === 0) {
    return (
      <div>
        <Navbar />
        <div className="dashboard-container">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div>
        <Navbar />
        <div className="dashboard-container">
          <h1>Learning Resources</h1>
          <p>Complete an exam to unlock personalized learning resources!</p>
          <button className="btn-primary" onClick={() => navigate('/student/subjects')}>
            Take an Exam
          </button>
        </div>
      </div>
    );
  }

  const subjectInfo = getSubjectInfo();
  const performanceCategory = subjectInfo?.latest_percentage <= 40 ? 'below_40' : 
                              subjectInfo?.latest_percentage <= 80 ? '40_to_80' : 'above_80';

  return (
    <div>
      <Navbar />
      <div className="dashboard-container">
        <h1>Learning Resources</h1>
        <p>Access your personalized learning materials based on exam performance</p>

        <div className="subject-selector" style={{ marginBottom: '20px' }}>
          <label><strong>Select Subject:</strong></label>
          <select 
            value={selectedSubject || ''} 
            onChange={(e) => handleSubjectChange(parseInt(e.target.value))}
            style={{ padding: '8px', fontSize: '16px', marginLeft: '10px' }}
          >
            {subjects.map(subject => {
              const percentage = subject.latest_percentage != null ? parseFloat(subject.latest_percentage) : 0;
              return (
                <option key={subject.subject_id} value={subject.subject_id}>
                  {subject.subject_name} (Score: {percentage.toFixed(2)}%)
                </option>
              );
            })}
          </select>
        </div>

        {subjectInfo && (
          <div className="performance-badge" style={{
            padding: '10px',
            backgroundColor: performanceCategory === 'below_40' ? '#ffebee' : 
                           performanceCategory === '40_to_80' ? '#fff3e0' : '#e8f5e9',
            borderRadius: '5px',
            marginBottom: '20px'
          }}>
            <strong>Performance Category:</strong> {
              performanceCategory === 'below_40' ? 'Basic Level (≤40%)' :
              performanceCategory === '40_to_80' ? 'Intermediate Level (40-80%)' :
              'Advanced Level (≥80%)'
            }
          </div>
        )}

        {loading ? (
          <p>Loading resources...</p>
        ) : resources.length === 0 ? (
          <p>No resources available for this subject.</p>
        ) : (
          <div className="resources-grid">
            {resources.map((resource) => (
              <div key={resource.id} className="resource-card">
                <div className="resource-header">
                  <h3>
                    {resource.resource_type === 'youtube' && '📺'}
                    {resource.resource_type === 'certification' && '📜'}
                    {resource.resource_type === 'course' && '📚'}
                    {resource.resource_type === 'project' && '💻'}
                    {' '}
                    {resource.resource_title}
                  </h3>
                  <span className="resource-type-badge">{resource.resource_type}</span>
                </div>
                <p>{resource.resource_url}</p>
                <div className="resource-actions">
                  <button 
                    className="btn-primary"
                    onClick={() => handleResourceClick(resource.id, resource.resource_url)}
                  >
                    Open Resource
                  </button>
                  {resource.progress?.completed ? (
                    <span className="completed-badge">✓ Completed</span>
                  ) : (
                    <button 
                      className="btn-secondary"
                      onClick={() => markAsCompleted(resource.id)}
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
                {resource.progress && (
                  <div className="progress-bar" style={{ marginTop: '10px' }}>
                    <div 
                      className="progress-fill" 
                      style={{ 
                        width: `${resource.progress.progress_percentage}%`,
                        height: '5px',
                        backgroundColor: '#4CAF50'
                      }}
                    />
                  </div>
                )}
          </div>
            ))}
          </div>
        )}

        <div className="instructions" style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
          <h3>How It Works</h3>
          <ul>
            <li><strong>Score ≤ 40%</strong>: YouTube classes + Basic certifications</li>
            <li><strong>Score 40-80%</strong>: YouTube classes + Advanced courses + Basic projects</li>
            <li><strong>Score ≥ 80%</strong>: Advanced certifications + Advanced projects</li>
          </ul>
          <p>Click "Open Resource" to access the learning material. Mark resources as complete after finishing them!</p>
        </div>
      </div>
    </div>
  );
};

export default LearningResources;