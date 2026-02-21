import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./App.css";

// User Pages
import UserLogin from "./pages/User/UserLogin";
import UserRegistration from "./pages/User/UserRegistration";
import UserExamPage from "./pages/User/UserExamPage";

// HR Pages
import HRLogin from "./pages/Admin/HRLogin";
import HRDashboard from "./pages/Admin/HRDashboard";
import HRHome from "./pages/Admin/HRHome";
import ExamList from "./pages/Admin/ExamList";
import ExamBuilder from "./pages/Admin/ExamBuilder";
import HRLayout from "./layout/HRLayout";

// Utility Components
import LocationGate from "./components/Admin/LocationGate";

// Redirect Component to preserve query params
function RedirectWithParams({ to }) {
  const searchParams = window.location.search;
  return <Navigate to={`${to}${searchParams}`} replace />;
}

// Protected Route Component
function ProtectedRoute({ children, requiredUserType }) {
  const authToken = localStorage.getItem("authToken");
  const userType = localStorage.getItem("userType");

  if (!authToken) {
    // Redirect to appropriate login based on required user type
    if (requiredUserType === "hr") {
      return <Navigate to="/hr-login" replace />;
    }
    return <Navigate to="/user-login" replace />;
  }

  if (requiredUserType && userType !== requiredUserType) {
    // Redirect to appropriate login based on required user type
    if (requiredUserType === "hr") {
      return <Navigate to="/hr-login" replace />;
    }
    return <Navigate to="/user-login" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <Routes>
        {/* =========================================== 
            User Routes 
            =========================================== */}
        {/* Public Routes - Protected by Location */}
        <Route path="/" element={<RedirectWithParams to="/user-login" />} />
        <Route
          path="/user-login"
          element={
            <LocationGate>
              <UserLogin />
            </LocationGate>
          }
        />
        {/* <Route path="/user-login" element={<UserLogin />} /> */}
        <Route path="/user-register" element={<UserRegistration />} />
        {/* Protected User Routes */}
        <Route
          path="/user-dashboard"
          element={
            <ProtectedRoute requiredUserType="user">
              <UserExamPage />
            </ProtectedRoute>
          }
        />

        {/* =========================================== 
            Admin Routes - Protected by Auth and User Type, with Location Gate on Login 
            =========================================== */}
        {/* Protected HR Routes */}
        <Route path="/hr-login" element={<HRLogin />} />
        <Route
          path="/hr-home"
          element={
            <HRLayout>
              <HRHome />
            </HRLayout>
          }
        />
        <Route
          path="/hr/candidate-dashboard"
          element={
            <HRLayout>
              <HRDashboard />
            </HRLayout>
          }
        />
        <Route
          path="/hr/exam"
          element={
            <HRLayout>
              <ExamList />
            </HRLayout>
          }
        />
        <Route
          path="/hr/exams/create"
          element={
            <HRLayout>
              <ExamBuilder />
            </HRLayout>
          }
        />

        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/user-login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
