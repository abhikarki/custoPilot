import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
}

export const organizationsAPI = {
  list: () => api.get('/organizations'),
  get: (id) => api.get(`/organizations/${id}`),
  create: (data) => api.post('/organizations', data),
  update: (id, data) => api.put(`/organizations/${id}`, data),
  delete: (id) => api.delete(`/organizations/${id}`),
  listDepartments: (orgId) => api.get(`/organizations/${orgId}/departments`),
  createDepartment: (orgId, data) => api.post(`/organizations/${orgId}/departments`, data),
  deleteDepartment: (orgId, deptId) => api.delete(`/organizations/${orgId}/departments/${deptId}`),
}

export const chatbotsAPI = {
  list: (orgId) => api.get('/chatbots', { params: { organization_id: orgId } }),
  get: (chatbotId) => api.get(`/chatbots/${chatbotId}`),
  create: (orgId, data) => api.post('/chatbots', data, { params: { organization_id: orgId } }),
  update: (chatbotId, data) => api.put(`/chatbots/${chatbotId}`, data),
  delete: (chatbotId) => api.delete(`/chatbots/${chatbotId}`),
  getEmbedCode: (chatbotId) => api.get(`/chatbots/${chatbotId}/embed-code`),
}

export const knowledgeAPI = {
  upload: (orgId, formData) => api.post('/knowledge/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    params: { organization_id: orgId },
  }),
  list: (orgId, params) => api.get('/knowledge', { params: { organization_id: orgId, ...params } }),
  get: (docId) => api.get(`/knowledge/${docId}`),
  getChunks: (docId) => api.get(`/knowledge/${docId}/chunks`),
  reprocess: (docId) => api.post(`/knowledge/${docId}/reprocess`),
  delete: (docId) => api.delete(`/knowledge/${docId}`),
  search: (orgId, query, params) => api.post('/knowledge/search', null, {
    params: { organization_id: orgId, query, ...params }
  }),
}

export const chatAPI = {
  sendMessage: (orgId, message, sessionId) => api.post('/chat/message', {
    content: message,
    session_id: sessionId,
  }, { params: { organization_id: orgId } }),
  getConversation: (conversationId) => api.get(`/chat/conversations/${conversationId}`),
  getConversationBySession: (orgId, sessionId) => api.get(`/chat/conversations/session/${sessionId}`, {
    params: { organization_id: orgId }
  }),
  listConversations: (orgId, params) => api.get('/chat/conversations', {
    params: { organization_id: orgId, ...params }
  }),
  closeConversation: (conversationId) => api.post(`/chat/conversations/${conversationId}/close`),
}

export const supportAPI = {
  listEscalations: (orgId, params) => api.get('/support/escalations', {
    params: { organization_id: orgId, ...params }
  }),
  getEscalation: (escalationId) => api.get(`/support/escalations/${escalationId}`),
  assignEscalation: (escalationId, assignedToId) => api.post(`/support/escalations/${escalationId}/assign`, {
    assigned_to_id: assignedToId
  }),
  resolveEscalation: (escalationId, data) => api.post(`/support/escalations/${escalationId}/resolve`, data),
  dismissEscalation: (escalationId, reason) => api.post(`/support/escalations/${escalationId}/dismiss`, null, {
    params: { reason }
  }),
  overrideMessage: (conversationId, messageId, newContent) => api.post(
    `/support/conversations/${conversationId}/override`,
    null,
    { params: { message_id: messageId, new_content: newContent } }
  ),
  getQueueStats: (orgId) => api.get('/support/queue/stats', {
    params: { organization_id: orgId }
  }),
}

export const agentsAPI = {
  listPipelines: (orgId, params) => api.get('/agents/pipelines', {
    params: { organization_id: orgId, ...params }
  }),
  getPipeline: (pipelineId) => api.get(`/agents/pipelines/${pipelineId}`),
  createPipeline: (orgId, data) => api.post('/agents/pipelines', data, {
    params: { organization_id: orgId }
  }),
  updatePipeline: (pipelineId, data) => api.put(`/agents/pipelines/${pipelineId}`, data),
  initializeDefaults: (orgId) => api.post('/agents/pipelines/initialize-defaults', null, {
    params: { organization_id: orgId }
  }),
  listRuns: (pipelineId, params) => api.get(`/agents/pipelines/${pipelineId}/runs`, { params }),
  getRun: (runId) => api.get(`/agents/runs/${runId}`),
  getPipelineGraph: (pipelineType) => api.get(`/agents/graph/${pipelineType}`),
}

export const voiceAPI = {
  transcribe: (audioData, format) => api.post('/voice/transcribe', {
    audio_data: audioData,
    format,
  }),
  synthesize: (text, voice) => api.post('/voice/synthesize', {
    text,
    voice,
  }),
  listVoices: () => api.get('/voice/voices'),
}

export default api
