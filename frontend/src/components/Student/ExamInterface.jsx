import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { requestFullscreen, exitFullscreen, onFullscreenChange, removeFullscreenListener, isFullscreen } from '../../utils/fullscreenHandler';
import { TabSwitchDetector } from '../../utils/tabSwitchDetector';
import api from '../../utils/api';

const ExamInterface = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30 * 60); // 30 minutes
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [detector, setDetector] = useState(null);
  const [fullscreenReady, setFullscreenReady] = useState(false);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true);
  const handlersRef = useRef({ fullscreenHandler: null, contextMenuHandler: null, keydownHandler: null });

  useEffect(() => {
    loadExamData();
    return () => {
      if (detector) {
        detector.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadExamData = () => {
    try {
      // Get exam data from localStorage
      const examData = JSON.parse(localStorage.getItem('currentExam'));
      if (!examData) {
        alert('No active exam found');
        navigate('/student/subjects');
        return;
      }

      setQuestions(examData.questions);

      // Load saved answers from localStorage
      const savedExamAnswers = localStorage.getItem('examAnswers');
      if (savedExamAnswers) {
        try {
          const savedData = JSON.parse(savedExamAnswers);
          if (savedData.examId === parseInt(examId)) {
            setAnswers(savedData.answers || {});
          }
        } catch (e) {
          console.error('Error loading saved answers:', e);
        }
      }
    } catch (error) {
      console.error('Exam data loading error:', error);
      alert('Failed to load exam data');
      navigate('/student/subjects');
    }
  };

  const startFullscreenExam = async () => {
    try {
      // Request fullscreen - REQUIRED for exam start
      await requestFullscreen();
      setFullscreenReady(true);
      setShowFullscreenPrompt(false);
      
      // Now initialize all exam monitoring
      initializeExamMonitoring();
    } catch (error) {
      console.error('Fullscreen error:', error);
      alert('Fullscreen mode is required to start the exam. Please allow fullscreen access and try again.');
    }
  };

  const initializeExamMonitoring = () => {
    try {

      // Setup tab switch detection
      const tabDetector = new TabSwitchDetector((count) => {
        if (submitting) return; // Don't trigger if already submitting
        setTabSwitchCount(count);
        if (count >= 1 && !submitting) {
          alert('⚠️ Tab switch detected! Your exam will be automatically submitted.');
          setTimeout(() => {
            if (!submitting) {
              submitExam(true);
            }
          }, 1000);
        }
      });
      tabDetector.start();
      setDetector(tabDetector);

      // Setup fullscreen monitoring
      const handleFullscreenChange = () => {
        if (submitting) return; // Don't trigger if already submitting
        if (!isFullscreen() && !submitting) {
          alert('⚠️ You exited fullscreen mode! Your exam will be automatically submitted.');
          setTimeout(() => {
            if (!submitting) {
              submitExam(true);
            }
          }, 1000);
        }
      };
      onFullscreenChange(handleFullscreenChange);
      handlersRef.current.fullscreenHandler = handleFullscreenChange;

      // Prevent context menu
      const contextMenuHandler = (e) => {
        if (!submitting) {
          e.preventDefault();
        }
      };
      document.addEventListener('contextmenu', contextMenuHandler);
      handlersRef.current.contextMenuHandler = contextMenuHandler;

      // Prevent keyboard shortcuts
      const keydownHandler = (e) => {
        if (submitting) return;
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I') || 
            (e.ctrlKey && e.shiftKey && e.key === 'C') || (e.ctrlKey && e.key === 'U')) {
          e.preventDefault();
          alert('⚠️ This action is not allowed during exam!');
          return false;
        }
      };
      document.addEventListener('keydown', keydownHandler);
      handlersRef.current.keydownHandler = keydownHandler;

      // Cleanup function
      return () => {
        if (detector) {
          detector.stop();
        }
        if (handlersRef.current.fullscreenHandler) {
          removeFullscreenListener(handlersRef.current.fullscreenHandler);
        }
        if (handlersRef.current.contextMenuHandler) {
          document.removeEventListener('contextmenu', handlersRef.current.contextMenuHandler);
        }
        if (handlersRef.current.keydownHandler) {
          document.removeEventListener('keydown', handlersRef.current.keydownHandler);
        }
      };
    } catch (error) {
      console.error('Exam initialization error:', error);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (timeRemaining > 0 && !submitting) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0) {
      submitExam(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, submitting]);

  // Auto-save answers every 30 seconds
  useEffect(() => {
    if (!submitting && fullscreenReady) {
      const autoSaveInterval = setInterval(() => {
        saveAnswersToLocalStorage(answers);
      }, 30000); // 30 seconds

      return () => clearInterval(autoSaveInterval);
    }
  }, [answers, submitting, fullscreenReady]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId, answer) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);
    saveAnswersToLocalStorage(newAnswers);
  };

  const saveAnswersToLocalStorage = (answersToSave) => {
    try {
      const examAnswersData = {
        examId: parseInt(examId),
        answers: answersToSave,
        lastSaved: Date.now()
      };
      localStorage.setItem('examAnswers', JSON.stringify(examAnswersData));
    } catch (error) {
      console.error('Failed to save answers to localStorage:', error);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      saveAnswersToLocalStorage(answers);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      saveAnswersToLocalStorage(answers);
    }
  };

  const submitExam = async (autoSubmit = false) => {
    if (submitting) return;

    setSubmitting(true);

    try {
      // Stop all monitoring immediately to prevent popups
      if (detector) {
        detector.stop();
        setDetector(null);
      }

      // Remove all event listeners
      if (handlersRef.current.fullscreenHandler) {
        removeFullscreenListener(handlersRef.current.fullscreenHandler);
        handlersRef.current.fullscreenHandler = null;
      }
      if (handlersRef.current.contextMenuHandler) {
        document.removeEventListener('contextmenu', handlersRef.current.contextMenuHandler);
        handlersRef.current.contextMenuHandler = null;
      }
      if (handlersRef.current.keydownHandler) {
        document.removeEventListener('keydown', handlersRef.current.keydownHandler);
        handlersRef.current.keydownHandler = null;
      }
      
      const answerArray = Object.keys(answers).map(questionId => ({
        question_id: parseInt(questionId),
        answer: answers[questionId]
      }));

      console.log('📤 Submitting exam with answers:', answerArray);
      console.log('📊 Total answers:', answerArray.length);
      console.log('📝 Descriptive answers:', answerArray.filter(a => 
        questions.find(q => q.id === a.question_id)?.question_type === 'descriptive'
      ));

      const response = await api.post('/exams/submit', {
        exam_id: parseInt(examId),
        answers: answerArray,
        tab_switch_count: tabSwitchCount
      });

      // Cleanup
      localStorage.removeItem('currentExam');
      localStorage.removeItem('examAnswers');

      // Exit fullscreen if still active
      try {
        if (isFullscreen()) {
          await exitFullscreen();
        }
      } catch (e) {
        // Ignore fullscreen exit errors
        console.log('Fullscreen exit attempted');
      }

      // Show results immediately
      const percentage = response.data.results.percentage != null ? parseFloat(response.data.results.percentage) : 0;
      const totalScore = response.data.results.total_score != null ? response.data.results.total_score : 0;
      const mcqScore = response.data.results.mcq_score != null ? response.data.results.mcq_score : 0;
      const descScore = response.data.results.descriptive_score != null ? parseFloat(response.data.results.descriptive_score) : 0;
      
      // Show results modal
      const resultMessage = `Exam Submitted Successfully!\n\n` +
        `MCQ Score: ${mcqScore}/8\n` +
        `Descriptive Score: ${descScore.toFixed(2)}/12\n` +
        `Total Score: ${totalScore}/20\n` +
        `Percentage: ${percentage.toFixed(2)}%\n\n` +
        `View detailed evaluation on the dashboard!`;
      
      alert(resultMessage);
      
      // Navigate to dashboard
      navigate('/student/dashboard');

    } catch (error) {
      console.error('Exam submission error:', error);
      alert('Error submitting exam. Please try again.');
      setSubmitting(false);
    }
  };

  // Show fullscreen prompt before starting exam
  if (showFullscreenPrompt && questions.length > 0) {
    return (
      <div className="fullscreen-warning">
        <div className="fullscreen-prompt-content">
          <h2>⚠️ Fullscreen Mode Required</h2>
          <p>This exam must be taken in fullscreen mode to ensure exam integrity.</p>
          <p>Click the button below to enter fullscreen and start your exam.</p>
          <ul className="fullscreen-rules">
            <li>✓ Exam duration: 30 minutes</li>
            <li>✓ Questions: 8 MCQ + 2 Descriptive</li>
            <li>✓ Exiting fullscreen will auto-submit your exam</li>
            <li>✓ Switching tabs will auto-submit your exam</li>
          </ul>
          <button className="btn-primary btn-large" onClick={startFullscreenExam}>
            Enter Fullscreen & Start Exam
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="exam-interface">
        <div className="exam-header">
          <h2>Loading Exam...</h2>
        </div>
      </div>
    );
  }

  if (!fullscreenReady) {
    return (
      <div className="exam-interface">
        <div className="exam-header">
          <h2>Initializing Exam...</h2>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  return (
    <div className="exam-interface">
      <div className="exam-header">
        <h2>Exam In Progress</h2>
        <div className="exam-timer">
          ⏱️ Time Remaining: {formatTime(timeRemaining)}
        </div>
      </div>

      <div className="exam-content">
        {/* Question Progress Indicator */}
        <div className="exam-pagination">
          <div className="question-progress">
            Question {currentQuestionIndex + 1} of {questions.length}
          </div>
        </div>

        {/* Current Question */}
        <div className="question-card">
          <h3>
            Question {currentQuestionIndex + 1}{' '}
            {currentQuestion.question_type === 'mcq' ? '(MCQ - 1 mark)' : '(Descriptive - 6 marks)'}
          </h3>
          <p className="question-text">{currentQuestion.question_text}</p>

          {currentQuestion.question_type === 'mcq' && currentQuestion.options ? (
            <div className="mcq-options">
              {Object.entries(
                typeof currentQuestion.options === 'string'
                  ? JSON.parse(currentQuestion.options || '{}')
                  : currentQuestion.options || {}
              ).map(([key, value]) => (
                <label key={key} className="mcq-option">
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value={key}
                    checked={answers[currentQuestion.id] === key}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  />
                  <span>
                    {key}. {value}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <textarea
              className="descriptive-answer"
              rows="10"
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              placeholder="Write your detailed answer here..."
            />
          )}
        </div>
      </div>

      <div className="exam-footer">
        <div className="pagination-buttons">
          <button
            className="btn-previous"
            onClick={handlePrevious}
            disabled={isFirstQuestion || submitting}
          >
            ← Previous
          </button>

          {!isLastQuestion ? (
            <button
              className="btn-next"
              onClick={handleNext}
              disabled={submitting}
            >
              Next →
            </button>
          ) : (
            <button
              className="btn-submit-exam"
              onClick={() => submitExam(false)}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Exam'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamInterface;