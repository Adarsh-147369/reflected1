import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../Common/Navbar';
import api from '../../utils/api';
import '../../styles/components.css';

const EvaluationDashboard = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [evaluation, setEvaluation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEvaluationDetails();
  }, [examId]);

  const fetchEvaluationDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/exams/evaluation/${examId}`);
      setEvaluation(response.data);
    } catch (error) {
      console.error('Error fetching evaluation:', error);
      setError('Failed to load evaluation details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="dashboard-container">
          <div className="loading">Loading evaluation details...</div>
        </div>
      </div>
    );
  }

  if (error || !evaluation) {
    return (
      <div>
        <Navbar />
        <div className="dashboard-container">
          <div className="error-message">
            {error || 'Evaluation details not found'}
          </div>
          <button onClick={() => navigate('/student/dashboard')} className="btn btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { exam, questions } = evaluation;
  const percentage = exam.percentage != null ? parseFloat(exam.percentage) : 0;
  const mcqQuestions = questions.filter(q => q.question_type === 'mcq');
  const descriptiveQuestions = questions.filter(q => q.question_type === 'descriptive');

  return (
    <div>
      <Navbar />
      <div className="dashboard-container">
        <div className="evaluation-header">
          <h1>📊 Exam Evaluation Report</h1>
          <button onClick={() => navigate('/student/dashboard')} className="btn btn-secondary">
            ← Back to Dashboard
          </button>
        </div>

        {/* Overall Summary */}
        <div className="evaluation-summary">
          <div className="summary-card">
            <h3>Subject</h3>
            <p className="summary-value">{exam.subject_name}</p>
          </div>
          <div className="summary-card">
            <h3>Date</h3>
            <p className="summary-value">
              {exam.completed_at 
                ? new Date(exam.completed_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'N/A'}
            </p>
          </div>
          <div className="summary-card">
            <h3>Total Score</h3>
            <p className="summary-value score">{exam.total_score || 0}/20</p>
          </div>
          <div className="summary-card">
            <h3>Percentage</h3>
            <p className={`summary-value percentage ${percentage >= 80 ? 'excellent' : percentage >= 60 ? 'good' : percentage >= 40 ? 'average' : 'poor'}`}>
              {percentage.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="score-breakdown">
          <h2>Score Breakdown</h2>
          <div className="breakdown-grid">
            <div className="breakdown-item">
              <div className="breakdown-header">
                <span className="breakdown-icon">✓</span>
                <span>MCQ Score</span>
              </div>
              <div className="breakdown-value">
                <span className="score-number">{exam.mcq_score || 0}</span>
                <span className="score-total">/ 8</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${((exam.mcq_score || 0) / 8) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="breakdown-item">
              <div className="breakdown-header">
                <span className="breakdown-icon">📝</span>
                <span>Descriptive Score</span>
              </div>
              <div className="breakdown-value">
                <span className="score-number">{parseFloat(exam.descriptive_score || 0).toFixed(2)}</span>
                <span className="score-total">/ 12</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${((exam.descriptive_score || 0) / 12) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* MCQ Questions Evaluation */}
        <div className="questions-section">
          <h2>Multiple Choice Questions (MCQ) - {mcqQuestions.length} Questions</h2>
          {mcqQuestions.map((question, index) => {
            const options = typeof question.options === 'string' 
              ? JSON.parse(question.options) 
              : (question.options || {});
            const studentAnswer = question.student_answer || '';
            const correctAnswer = question.correct_answer || '';
            const isCorrect = studentAnswer.toUpperCase() === correctAnswer.toUpperCase();
            const marksObtained = question.marks_obtained || 0;

            return (
              <div key={question.id} className={`question-card ${isCorrect ? 'correct' : 'incorrect'}`}>
                <div className="question-header">
                  <span className="question-number">Q{index + 1}</span>
                  <span className={`status-badge ${isCorrect ? 'correct' : 'incorrect'}`}>
                    {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                  <span className="marks-badge">
                    {marksObtained}/1 mark{marksObtained !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="question-text">{question.question_text}</div>
                <div className="options-grid">
                  {Object.entries(options).map(([key, value]) => {
                    const isStudentChoice = key.toUpperCase() === studentAnswer.toUpperCase();
                    const isCorrectChoice = key.toUpperCase() === correctAnswer.toUpperCase();
                    let optionClass = 'option';
                    if (isCorrectChoice) optionClass += ' correct-option';
                    if (isStudentChoice && !isCorrect) optionClass += ' wrong-choice';
                    if (isStudentChoice && isCorrect) optionClass += ' student-choice';

                    return (
                      <div key={key} className={optionClass}>
                        <span className="option-key">{key}.</span>
                        <span className="option-text">{value}</span>
                        {isCorrectChoice && <span className="option-indicator">✓ Correct</span>}
                        {isStudentChoice && <span className="option-indicator your-answer">Your Answer</span>}
                      </div>
                    );
                  })}
                </div>
                <div className="evaluation-detail">
                  <p><strong>Your Answer:</strong> {studentAnswer || 'Not answered'}</p>
                  <p><strong>Correct Answer:</strong> {correctAnswer}</p>
                  <p><strong>Marks Obtained:</strong> {marksObtained}/1</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Descriptive Questions Evaluation */}
        <div className="questions-section">
          <h2>Descriptive Questions - {descriptiveQuestions.length} Questions</h2>
          {descriptiveQuestions.map((question, index) => {
            const studentAnswer = question.student_answer || '';
            const modelAnswer = question.correct_answer || '';
            const marksObtained = parseFloat(question.marks_obtained || 0);
            const similarity = question.similarity || (marksObtained / 6);
            const maxMarks = 6;

            return (
              <div key={question.id} className="question-card descriptive">
                <div className="question-header">
                  <span className="question-number">Q{index + 1}</span>
                  <span className="marks-badge">
                    {marksObtained.toFixed(2)}/{maxMarks} marks
                  </span>
                  <span className="similarity-badge">
                    Similarity: {(similarity * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="question-text">{question.question_text}</div>
                
                <div className="answer-section">
                  <div className="answer-box">
                    <h4>Your Answer:</h4>
                    <div className="answer-text">
                      {studentAnswer || 'No answer provided'}
                    </div>
                  </div>

                  <div className="answer-box">
                    <h4>Model Answer:</h4>
                    <div className="answer-text model-answer">
                      {modelAnswer}
                    </div>
                  </div>
                </div>

                <div className="evaluation-metrics">
                  <div className="metric">
                    <span className="metric-label">Semantic Similarity:</span>
                    <span className="metric-value">{((similarity || 0) * 100).toFixed(2)}%</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Marks Obtained:</span>
                    <span className="metric-value">{marksObtained.toFixed(2)}/{maxMarks}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Evaluation Method:</span>
                    <span className="metric-value">SBERT (Semantic Similarity)</span>
                  </div>
                </div>

                <div className="similarity-explanation">
                  <p><strong>How it works:</strong> Your answer is compared with the model answer using 
                  SBERT (Sentence-BERT), which calculates semantic similarity. The marks are calculated 
                  as: Similarity × {maxMarks} = {marksObtained.toFixed(2)} marks.</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Performance Category */}
        <div className="performance-category">
          <h2>Performance Category</h2>
          <div className={`category-card ${percentage >= 80 ? 'excellent' : percentage >= 60 ? 'good' : percentage >= 40 ? 'average' : 'poor'}`}>
            <h3>
              {percentage >= 80 ? '🌟 Excellent' : 
               percentage >= 60 ? '👍 Good' : 
               percentage >= 40 ? '📚 Average' : '💪 Needs Improvement'}
            </h3>
            <p>
              {percentage >= 80 
                ? 'Outstanding performance! You have access to advanced certifications and projects.'
                : percentage >= 60
                ? 'Good performance! You have access to advanced courses and basic projects.'
                : percentage >= 40
                ? 'Average performance. You have access to YouTube classes and basic certifications.'
                : 'Keep practicing! You have access to YouTube classes and basic certifications.'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="evaluation-actions">
          <button onClick={() => navigate('/student/dashboard')} className="btn btn-primary">
            Back to Dashboard
          </button>
          <button onClick={() => navigate('/student/resources')} className="btn btn-secondary">
            View Learning Resources
          </button>
        </div>
      </div>
    </div>
  );
};

export default EvaluationDashboard;

