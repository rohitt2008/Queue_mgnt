import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/layout/Navbar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { QueuesDashboard } from './pages/QueuesDashboard';
import { QueueControlRoom } from './pages/QueueControlRoom';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';
import { LiveDisplayBoard } from './pages/LiveDisplayBoard';
import { CustomerKiosk } from './pages/CustomerKiosk';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-2" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Layout wrapper to hide Navbar on TV display and Kiosk
const LayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isDisplayOrKiosk =
    location.pathname.startsWith('/display/') || location.pathname.startsWith('/kiosk/');

  return (
    <div className="min-h-screen flex flex-col">
      {!isDisplayOrKiosk && <Navbar />}
      <div className="flex-1">{children}</div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <LayoutWrapper>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/display/:id" element={<LiveDisplayBoard />} />
              <Route path="/kiosk/:id" element={<CustomerKiosk />} />

              {/* Protected Manager Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <QueuesDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/queue/:id"
                element={
                  <ProtectedRoute>
                    <QueueControlRoom />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <AnalyticsDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </LayoutWrapper>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;

