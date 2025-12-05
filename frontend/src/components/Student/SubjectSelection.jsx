import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../Common/Navbar';
import api from '../../utils/api';

const SubjectSelection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const streamSubjects = {
    CSE: [
      'Programming Languages and Programming Fundamentals',
      'Data Structures and Algorithms',
      'Operating Systems',
      'Database Management Systems',
      'Computer Networks'
    ],
    EEE: [
      'Electrical Machines',
      'Power Systems',
      'Power Electronics',
      'Circuit Theory',
      'Control Systems'
    ],
    ECE: [
      'Digital Electronics',
      'Analog Electronics',
      'Signals & Systems',
      'Communication Systems',
      'Electromagnetic Theory'
    ],
    mech: [
      'Thermodynamics',
      'Fluid Mechanics',
      'Machine Design',
      'Manufacturing Technology',
      'Strength of Materials'
    ],
    civil: [
      'Structural Engineering',
      'Strength of Materials',
      'Concrete Technology',
      'Soil Mechanics',
      'Surveying'
    ]
  };

  useEffect(() => {
    fetchSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/questions/subjects');
      const allSubjects = response.data.subjects || [];
      const userSubjects = allSubjects.filter(s => s.stream === user?.stream);
      setSubjects(userSubjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      // Fallback to hardcoded subjects
      const subjectsForStream = streamSubjects[user?.stream] || [];
      setSubjects(subjectsForStream.map((name, index) => ({
        id: index + 1,
        name
      })));
    } finally {
      setLoading(false);
    }
  };

  const startExam = async (subjectId) => {
    setStarting(true);
    try {
      const response = await api.post('/exams/start', { subject_id: subjectId });

      // Store exam data and navigate to exam interface
      localStorage.setItem('currentExam', JSON.stringify({
        examId: response.data.exam.id,
        questions: response.data.questions
      }));

      navigate(`/student/exam/${response.data.exam.id}`);
    } catch (error) {
      console.error('Error starting exam:', error);
      alert('Failed to start exam. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="dashboard-container">
        <h1>Select Subject for Exam</h1>
        <p>Stream: {user?.stream}</p>

        {loading ? (
          <p>Loading subjects...</p>
        ) : (
          <div className="subject-grid">
            {subjects.map((subject) => (
              <div key={subject.id} className="subject-card">
                <h3>{subject.name}</h3>
                <div className="subject-info">
                  <p>⏱️ Duration: 30 minutes</p>
                  <p>📝 Questions: 8 MCQ + 2 Descriptive</p>
                  <p>🎯 Total Marks: 20</p>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => startExam(subject.id)}
                  disabled={starting}
                >
                  {starting ? 'Starting...' : 'Start Exam'}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="exam-instructions">
          <h3>⚠️ Important Instructions</h3>
          <ul>
            <li>Exam will start in full-screen mode</li>
            <li>You have 30 minutes to complete</li>
            <li>Switching tabs will auto-submit your exam</li>
            <li>Answer 8 MCQs (1 mark each) and 2 descriptive questions (6 marks each)</li>
            <li>Your answers will be evaluated automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SubjectSelection;