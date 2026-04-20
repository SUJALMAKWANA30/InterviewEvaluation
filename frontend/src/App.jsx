import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./App.css";

// User Pages
import UserLogin from './pages/User/UserLogin';
import UserRegistration from './pages/User/UserRegistration';
import UserDashboard from './pages/User/UserDashboard';
import QuizForm from './pages/User/QuizForm';
import ForgotPassword from './pages/User/ForgotPassword';
import ResetPassword from './pages/User/ResetPassword';

// HR Pages
import HRLogin from "./pages/Admin/HRLogin";
import HRDashboard from "./pages/Admin/HRDashboard";
import HRHome from "./pages/Admin/HRHome";
import ExamList from "./pages/Admin/ExamList";
import ExamBuilder from "./pages/Admin/ExamBuilder";
import DriveManager from "./pages/Admin/DriveManager";
import ReportsPage from "./pages/Admin/ReportsPage";
import AuditLogsPage from "./pages/Admin/AuditLogsPage";
import Candidate360Page from "./pages/Admin/Candidate360Page";
import ScorecardsPage from "./pages/Admin/ScorecardsPage";
import DecisionsWorkflowPage from "./pages/Admin/DecisionsWorkflowPage";
import AnalyticsCockpitPage from "./pages/Admin/AnalyticsCockpitPage";
import SecuritySettingsPage from "./pages/Admin/SecuritySettingsPage";
import HRLayout from "./layout/HRLayout";

// Admin
import AdminPanel from "./pages/Admin/AdminPanel";
import ApiDocsPage from "./pages/Admin/ApiDocsPage";

// Utility Components
import LocationGate from "./components/Admin/LocationGate";

// Permission-protected route — redirects to /hr-home if user lacks permission
function PermissionRoute({ children, module, action = "view" }) {
  const userData = (() => {
    try { return JSON.parse(localStorage.getItem("userData")) || {}; } catch { return {}; }
  })();
  const level = userData.level ?? 99;
  const permissions = userData.permissions || [];

  // Super admin bypasses all checks
  if (level === 0) return children;

  const hasPermission = permissions.some(
    (p) => p.module === module && p.actions?.includes(action)
  );

  // For "candidates" module, also allow users with any round permission
  if (!hasPermission && module === "candidates") {
    const hasRoundPermission = permissions.some(
      (p) =>
        ["round_r2", "round_r3", "round_r4"].includes(p.module) &&
        p.actions?.includes("view")
    );
    if (hasRoundPermission) return children;
  }

  if (!hasPermission) {
    return <Navigate to="/hr-home" replace />;
  }

  return children;
}

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
        {/* <Route
          path="/user-login"
          element={
            <LocationGate>
              <UserLogin />
            </LocationGate>
          }
        /> */}
        <Route path="/user-login" element={<UserLogin />} />
        <Route path="/user-register" element={<UserRegistration />} />
        <Route path="/user-forgot-password" element={<ForgotPassword />} />
        <Route path="/user-reset-password" element={<ResetPassword />} />
        {/* Protected User Routes */}
        <Route
          path="/user-dashboard"
          element={
            <ProtectedRoute requiredUserType="user">
              <UserDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quiz"
          element={
            <ProtectedRoute requiredUserType="user">
              <QuizForm />
            </ProtectedRoute>
          }
        />
 
        {/* Protected HR Routes */}
        <Route path="/hr-login" element={<HRLogin />} />
        <Route
          path="/hr-home"
          element={
            <ProtectedRoute requiredUserType="hr">
              <HRLayout>
                <HRHome />
              </HRLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/candidate-dashboard"
          element={
            <ProtectedRoute requiredUserType="hr">
              <HRLayout>
                <PermissionRoute module="candidates">
                  <HRDashboard />
                </PermissionRoute>
              </HRLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/exam"
          element={
            <ProtectedRoute requiredUserType="hr">
              <HRLayout>
                <PermissionRoute module="exams">
                  <ExamList />
                </PermissionRoute>
              </HRLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/exams/create"
          element={
            <ProtectedRoute requiredUserType="hr">
              <HRLayout>
                <PermissionRoute module="exams" action="create">
                  <ExamBuilder />
                </PermissionRoute>
              </HRLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/drives"
          element={
            <ProtectedRoute requiredUserType="hr">
              <HRLayout>
                <PermissionRoute module="drives">
                  <DriveManager />
                </PermissionRoute>
              </HRLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/candidate-360"
          element={
            <ProtectedRoute requiredUserType="hr">
              <HRLayout>
                <PermissionRoute module="search">
                  <Candidate360Page />
                </PermissionRoute>
              </HRLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/scorecards"
          element={
            <ProtectedRoute requiredUserType="hr">
              <HRLayout>
                <PermissionRoute module="scorecards">
                  <ScorecardsPage />
                </PermissionRoute>
              </HRLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/decisions"
          element={
            <ProtectedRoute requiredUserType="hr">
              <HRLayout>
                <PermissionRoute module="decisions">
                  <DecisionsWorkflowPage />
                </PermissionRoute>
              </HRLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/analytics"
          element={
            <ProtectedRoute requiredUserType="hr">
              <HRLayout>
                <PermissionRoute module="reports">
                  <AnalyticsCockpitPage />
                </PermissionRoute>
              </HRLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/reports"
          element={
            <ProtectedRoute requiredUserType="hr">
              <HRLayout>
                <PermissionRoute module="reports">
                  <ReportsPage />
                </PermissionRoute>
              </HRLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/security"
          element={
            <ProtectedRoute requiredUserType="hr">
              <HRLayout>
                <SecuritySettingsPage />
              </HRLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/audit-logs"
          element={
            <ProtectedRoute requiredUserType="hr">
              <HRLayout>
                <PermissionRoute module="audit_logs">
                  <AuditLogsPage />
                </PermissionRoute>
              </HRLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-settings"
          element={
            <ProtectedRoute requiredUserType="hr">
              <HRLayout>
                <PermissionRoute module="settings">
                  <AdminPanel />
                </PermissionRoute>
              </HRLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/exams/:id/builder"
          element={
            <ProtectedRoute requiredUserType="hr">
              <HRLayout>
                <PermissionRoute module="exams" action="edit">
                  <ExamBuilder />
                </PermissionRoute>
              </HRLayout>
            </ProtectedRoute>
          }
        />

        {/* Hidden API docs — accessible only via direct URL */}
        <Route path="/api-docs" element={<ApiDocsPage />} />

        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/user-login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
