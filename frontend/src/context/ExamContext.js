import React, { createContext, useState, useContext } from 'react';

const ExamContext = createContext();

export const useExam = () => {
  const context = useContext(ExamContext);
  if (!context) {
    throw new Error('useExam must be used within ExamProvider');
  }
  return context;
};

export const ExamProvider = ({ children }) => {
  const [currentExam, setCurrentExam] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(30 * 60); // 30 minutes in seconds

  const startExam = (examData, questions) => {
    setCurrentExam(examData);
    setExamQuestions(questions);
    setAnswers({});
    setTimeRemaining(30 * 60);
  };

  const updateAnswer = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const clearExam = () => {
    setCurrentExam(null);
    setExamQuestions([]);
    setAnswers({});
    setTimeRemaining(30 * 60);
  };

  const value = {
    currentExam,
    examQuestions,
    answers,
    timeRemaining,
    setTimeRemaining,
    startExam,
    updateAnswer,
    clearExam
  };

  return <ExamContext.Provider value={value}>{children}</ExamContext.Provider>;
};