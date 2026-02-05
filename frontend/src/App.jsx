import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'

// Layouts
import AdminLayout from './layouts/AdminLayout'
import SupportLayout from './layouts/SupportLayout'
import CustomerLayout from './layouts/CustomerLayout'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard'
import Departments from './pages/admin/Departments'
import KnowledgeUpload from './pages/admin/KnowledgeUpload'
import ChatbotBuilder from './pages/admin/ChatbotBuilder'
import AgentPipelines from './pages/admin/AgentPipelines'
import AgentTraces from './pages/admin/AgentTraces'
import TestChatbot from './pages/admin/TestChatbot'

// Support Pages
import SupportDashboard from './pages/support/Dashboard'
import Escalations from './pages/support/Escalations'
import Conversations from './pages/support/Conversations'

// Customer Pages
import CustomerChat from './pages/customer/Chat'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />
  }
  
  return children
}

function App() {
  const { isAuthenticated, user } = useAuthStore()

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Customer Chat (Public) */}
      <Route path="/chat/:orgId" element={
        <CustomerLayout>
          <CustomerChat />
        </CustomerLayout>
      } />
      
      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="departments" element={<Departments />} />
        <Route path="knowledge" element={<KnowledgeUpload />} />
        <Route path="chatbots" element={<ChatbotBuilder />} />
        <Route path="pipelines" element={<AgentPipelines />} />
        <Route path="traces" element={<AgentTraces />} />
        <Route path="test-chat" element={<TestChatbot />} />
      </Route>
      
      {/* Support Routes */}
      <Route path="/support" element={
        <ProtectedRoute allowedRoles={['admin', 'support']}>
          <SupportLayout />
        </ProtectedRoute>
      }>
        <Route index element={<SupportDashboard />} />
        <Route path="escalations" element={<Escalations />} />
        <Route path="conversations" element={<Conversations />} />
        <Route path="conversations/:conversationId" element={<Conversations />} />
      </Route>
      
      {/* Default redirect */}
      <Route path="/" element={
        isAuthenticated ? (
          user?.role === 'admin' ? (
            <Navigate to="/admin" replace />
          ) : user?.role === 'support' ? (
            <Navigate to="/support" replace />
          ) : (
            <Navigate to="/chat/demo" replace />
          )
        ) : (
          <Navigate to="/login" replace />
        )
      } />
    </Routes>
  )
}

export default App
