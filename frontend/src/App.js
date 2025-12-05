import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import StudentDashboard from './components/Student/Dashboard';
import SubjectSelection from './components/Student/SubjectSelection';
import ExamInterface from './components/Student/ExamInterface';
import LearningResources from './components/Student/LearningResources';
import ImprovementVisualization from './components/Student/ImprovementVisualization';
import EvaluationDashboard from './components/Student/EvaluationDashboard';
import AdminDashboard from './components/Admin/AdminDashboard';
import ProtectedRoute from './components/Common/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Student Routes */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute role="student">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/subjects"
            element={
              <ProtectedRoute role="student">
                <SubjectSelection />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/exam/:examId"
            element={
              <ProtectedRoute role="student">
                <ExamInterface />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/resources"
            element={
              <ProtectedRoute role="student">
                <LearningResources />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/improvement"
            element={
              <ProtectedRoute role="student">
                <ImprovementVisualization />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/evaluation/:examId"
            element={
              <ProtectedRoute role="student">
                <EvaluationDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;