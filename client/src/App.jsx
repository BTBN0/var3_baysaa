import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import { CallProvider } from "./context/CallContext.jsx";
import usePushNotifications from "./hooks/usePushNotifications.js";
import ToastContainer from "./components/ui/ToastContainer.jsx";
import CallToastManager from "./components/ui/CallToastManager.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import DMPage from "./pages/DMPage.jsx";
import FriendsPage from "./pages/FriendsPage.jsx";
import BannedMembersPage from "./pages/BannedMembersPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen text-white bg-[#0f1117]">
      Loading...
    </div>
  );
  return user ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen text-white bg-[#0f1117]">
      Loading...
    </div>
  );
  return !user ? children : <Navigate to="/dashboard" />;
};

const PushNotificationHandler = () => {
  usePushNotifications();
  return null;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/dashboard" />} />
    <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
    <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
    <Route path="/chat/:workspaceId/:channelId" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
    <Route path="/dm/:userId" element={<PrivateRoute><DMPage /></PrivateRoute>} />
    <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
    <Route path="/friends" element={<PrivateRoute><FriendsPage /></PrivateRoute>} />
    <Route path="/bans/:workspaceId" element={<PrivateRoute><BannedMembersPage /></PrivateRoute>} />
    <Route path="/" element={<LandingPage />} />
  </Routes>
);

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <SocketProvider>
        <CallProvider>
          <NotificationProvider>
            <PushNotificationHandler />
            <ToastContainer />
            <CallToastManager />
            <AppRoutes />
          </NotificationProvider>
        </CallProvider>
      </SocketProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;