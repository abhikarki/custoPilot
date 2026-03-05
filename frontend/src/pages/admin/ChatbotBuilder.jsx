import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chatbotsAPI, organizationsAPI, knowledgeAPI } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'
import {
  Plus,
  Bot,
  Trash2,
  Edit,
  Loader2,
  Settings,
  Code,
  Copy,
  Check,
  Folder,
  X,
  Palette,
  MessageSquare,
  Sliders,
  FileText,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

const colorPresets = [
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#0ea5e9', // Sky
  '#3b82f6', // Blue
]

export default function ChatbotBuilder() {
  const { getOrganizationId } = useAuthStore()
  const organizationId = getOrganizationId()
  const [showCreate, setShowCreate] = useState(false)
  const [editingBot, setEditingBot] = useState(null)
  const [showEmbed, setShowEmbed] = useState(null)
  const [copiedEmbed, setCopiedEmbed] = useState(false)
  const [expandedDepts, setExpandedDepts] = useState({})
  const queryClient = useQueryClient()

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    welcome_message: 'Hi! How can I help you today?',
    system_prompt: '',
    department_ids: [],
    document_ids: [],
    temperature: 0.7,
    confidence_threshold: 0.7,
    primary_color: '#6366f1',
  })

  const { data: chatbotsData, isLoading } = useQuery({
    queryKey: ['chatbots', organizationId],
    queryFn: () => chatbotsAPI.list(organizationId),
    enabled: !!organizationId,
  })

  const { data: deptsData } = useQuery({
    queryKey: ['departments', organizationId],
    queryFn: () => organizationsAPI.listDepartments(organizationId),
    enabled: !!organizationId,
  })

  // Fetch all documents for the organization
  const { data: docsData } = useQuery({
    queryKey: ['knowledge', organizationId],
    queryFn: () => knowledgeAPI.list(organizationId),
    enabled: !!organizationId,
  })

  const { data: embedData } = useQuery({
    queryKey: ['embed-code', showEmbed],
    queryFn: () => chatbotsAPI.getEmbedCode(showEmbed),
    enabled: !!showEmbed,
  })

  const createMutation = useMutation({
    mutationFn: (data) => chatbotsAPI.create(organizationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['chatbots'])
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => chatbotsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['chatbots'])
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => chatbotsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['chatbots'])
    },
  })

  const resetForm = () => {
    setShowCreate(false)
    setEditingBot(null)
    setExpandedDepts({})
    setFormData({
      name: '',
      description: '',
      welcome_message: 'Hi! How can I help you today?',
      system_prompt: '',
      department_ids: [],
      document_ids: [],
      temperature: 0.7,
      confidence_threshold: 0.7,
      primary_color: '#6366f1',
    })
  }

  const handleEdit = (bot) => {
    setEditingBot(bot)
    setFormData({
      name: bot.name,
      description: bot.description || '',
      welcome_message: bot.welcome_message,
      system_prompt: bot.system_prompt || '',
      department_ids: bot.departments?.map(d => d.id) || [],
      document_ids: bot.document_ids || [],
      temperature: bot.temperature,
      confidence_threshold: bot.confidence_threshold,
      primary_color: bot.primary_color,
    })
    setShowCreate(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingBot) {
      updateMutation.mutate({ id: editingBot.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const toggleDepartment = (deptId) => {
    setFormData(prev => {
      const isRemoving = prev.department_ids.includes(deptId)
      // If removing department, also remove its documents
      const deptDocs = (docsData?.data || []).filter(d => d.department_id === deptId).map(d => d.id)
      return {
        ...prev,
        department_ids: isRemoving
          ? prev.department_ids.filter(id => id !== deptId)
          : [...prev.department_ids, deptId],
        document_ids: isRemoving
          ? prev.document_ids.filter(id => !deptDocs.includes(id))
          : prev.document_ids
      }
    })
  }

  const toggleDocument = (docId) => {
    setFormData(prev => ({
      ...prev,
      document_ids: prev.document_ids.includes(docId)
        ? prev.document_ids.filter(id => id !== docId)
        : [...prev.document_ids, docId]
    }))
  }

  const toggleExpandDept = (deptId) => {
    setExpandedDepts(prev => ({
      ...prev,
      [deptId]: !prev[deptId]
    }))
  }

  // Group documents by department
  const getDocsByDept = (deptId) => {
    return (docsData?.data || []).filter(d => d.department_id === deptId && d.processing_status === 'completed')
  }

  const copyEmbed = () => {
    if (embedData?.data?.embed_code) {
      navigator.clipboard.writeText(embedData.data.embed_code)
      setCopiedEmbed(true)
      setTimeout(() => setCopiedEmbed(false), 2000)
    }
  }

  if (!organizationId) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-apple p-6 text-center">
        <p className="text-[14px] text-amber-700">No organization found. Please log out and register again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-semibold text-primary-600 tracking-tight">Chatbots</h1>
          <p className="text-[15px] text-primary-400 mt-1">Create and configure AI chatbots</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-500 text-white rounded-apple text-[14px] font-medium hover:bg-accent-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Chatbot
        </button>
      </div>

      {/* Create/Edit Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-primary-600/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-apple-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-modal">
            <div className="p-5 border-b border-primary-200 flex items-center justify-between sticky top-0 bg-white rounded-t-apple-lg">
              <h2 className="text-[19px] font-semibold text-primary-600">
                {editingBot ? 'Edit Chatbot' : 'Create Chatbot'}
              </h2>
              <button onClick={resetForm} className="p-1.5 hover:bg-primary-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-primary-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-[15px] font-medium text-primary-600 flex items-center gap-2">
                  <Bot className="w-5 h-5" /> Basic Info
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[13px] font-medium text-primary-500 mb-1.5">
                      Chatbot Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Sales Assistant"
                      className="w-full px-3.5 py-2.5 bg-primary-50 border border-primary-200 rounded-apple text-[14px] text-primary-600 placeholder-primary-400 focus:bg-white focus:border-primary-300 transition-colors"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[13px] font-medium text-primary-500 mb-1.5">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="What does this chatbot help with?"
                      rows={2}
                      className="w-full px-3.5 py-2.5 bg-primary-50 border border-primary-200 rounded-apple text-[14px] text-primary-600 placeholder-primary-400 focus:bg-white focus:border-primary-300 resize-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Knowledge Sources (Departments & Documents) */}
              <div className="space-y-4">
                <h3 className="text-[15px] font-medium text-primary-600 flex items-center gap-2">
                  <Folder className="w-5 h-5" /> Knowledge Sources
                </h3>
                <p className="text-[13px] text-primary-400">
                  Select departments and optionally specific documents
                </p>
                {deptsData?.data?.length > 0 ? (
                  <div className="space-y-2">
                    {deptsData.data.map((dept) => {
                      const deptDocs = getDocsByDept(dept.id)
                      const isExpanded = expandedDepts[dept.id]
                      const isDeptSelected = formData.department_ids.includes(dept.id)
                      const selectedDocsInDept = deptDocs.filter(d => formData.document_ids.includes(d.id)).length
                      
                      return (
                        <div key={dept.id} className="border border-primary-200 rounded-apple overflow-hidden">
                          {/* Department Header */}
                          <div className={`flex items-center p-3 ${isDeptSelected ? 'bg-accent-500/5' : 'bg-white'}`}>
                            <button
                              type="button"
                              onClick={() => toggleDepartment(dept.id)}
                              className={`w-5 h-5 rounded-md border flex items-center justify-center mr-3 transition-colors ${
                                isDeptSelected
                                  ? 'bg-accent-500 border-accent-500'
                                  : 'border-primary-300'
                              }`}
                            >
                              {isDeptSelected && <Check className="w-3 h-3 text-white" />}
                            </button>
                            <div className="flex-1" onClick={() => toggleDepartment(dept.id)}>
                              <p className="text-[14px] font-medium text-primary-600">{dept.name}</p>
                              <p className="text-[12px] text-primary-400">
                                {deptDocs.length} documents
                                {selectedDocsInDept > 0 && isDeptSelected && ` (${selectedDocsInDept} selected)`}
                              </p>
                            </div>
                            {isDeptSelected && deptDocs.length > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleExpandDept(dept.id)}
                                className="p-1.5 hover:bg-primary-100 rounded-lg transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-primary-400" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-primary-400" />
                                )}
                              </button>
                            )}
                          </div>
                          
                          {/* Documents List */}
                          {isExpanded && isDeptSelected && deptDocs.length > 0 && (
                            <div className="border-t border-primary-200 bg-primary-50 p-3 space-y-2">
                              <p className="text-[11px] text-primary-400 mb-2">
                                Select specific documents (leave unchecked to use all):
                              </p>
                              {deptDocs.map((doc) => (
                                <button
                                  key={doc.id}
                                  type="button"
                                  onClick={() => toggleDocument(doc.id)}
                                  className={`flex items-center gap-2 w-full p-2.5 rounded-apple text-left text-[13px] transition-colors ${
                                    formData.document_ids.includes(doc.id)
                                      ? 'bg-accent-500/10 text-accent-600'
                                      : 'bg-white hover:bg-primary-100 text-primary-600'
                                  }`}
                                >
                                  <FileText className="w-4 h-4 flex-shrink-0" />
                                  <span className="truncate">{doc.title || doc.original_filename}</span>
                                  {formData.document_ids.includes(doc.id) && (
                                    <Check className="w-4 h-4 ml-auto flex-shrink-0" />
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-[13px] text-amber-700 bg-amber-50 p-3 rounded-apple border border-amber-200">
                    No departments created yet. Create departments first.
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="space-y-4">
                <h3 className="text-[15px] font-medium text-primary-600 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" /> Messages
                </h3>
                <div>
                  <label className="block text-[13px] font-medium text-primary-500 mb-1.5">
                    Welcome Message
                  </label>
                  <input
                    type="text"
                    value={formData.welcome_message}
                    onChange={(e) => setFormData({ ...formData, welcome_message: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-primary-50 border border-primary-200 rounded-apple text-[14px] text-primary-600 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-primary-500 mb-1.5">
                    System Prompt (Advanced)
                  </label>
                  <textarea
                    value={formData.system_prompt}
                    onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                    placeholder="Custom instructions for the AI (e.g., tone, specific rules)"
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-primary-50 border border-primary-200 rounded-apple text-[13px] text-primary-600 font-mono focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition-colors"
                  />
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-4">
                <h3 className="text-[15px] font-medium text-primary-600 flex items-center gap-2">
                  <Sliders className="w-5 h-5" /> Settings
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-primary-50 rounded-apple p-4">
                    <label className="block text-[13px] font-medium text-primary-500 mb-2">
                      Temperature: <span className="text-accent-600">{formData.temperature}</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={formData.temperature}
                      onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                      className="w-full accent-accent-500"
                    />
                    <p className="text-[11px] text-primary-400 mt-1.5">
                      Lower = more focused, Higher = more creative
                    </p>
                  </div>
                  <div className="bg-primary-50 rounded-apple p-4">
                    <label className="block text-[13px] font-medium text-primary-500 mb-2">
                      Escalation Threshold: <span className="text-accent-600">{formData.confidence_threshold}</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={formData.confidence_threshold}
                      onChange={(e) => setFormData({ ...formData, confidence_threshold: parseFloat(e.target.value) })}
                      className="w-full accent-accent-500"
                    />
                    <p className="text-[11px] text-primary-400 mt-1.5">
                      Below this confidence → escalate to human
                    </p>
                  </div>
                </div>
              </div>

              {/* Appearance */}
              <div className="space-y-4">
                <h3 className="text-[15px] font-medium text-primary-600 flex items-center gap-2">
                  <Palette className="w-5 h-5" /> Appearance
                </h3>
                <div>
                  <label className="block text-[13px] font-medium text-primary-500 mb-3">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-3 flex-wrap">
                    {colorPresets.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, primary_color: color })}
                        className={`w-9 h-9 rounded-full transition-all duration-200 ${
                          formData.primary_color === color ? 'ring-2 ring-offset-2 ring-primary-400 scale-110' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="w-9 h-9 rounded-full cursor-pointer border-2 border-primary-200"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-primary-50 rounded-apple p-5">
                <h4 className="text-[13px] font-medium text-primary-500 mb-3">Preview</h4>
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shadow-subtle"
                    style={{ backgroundColor: formData.primary_color }}
                  >
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div
                    className="px-4 py-2.5 rounded-2xl text-white text-[14px] max-w-xs shadow-subtle"
                    style={{ backgroundColor: formData.primary_color }}
                  >
                    {formData.welcome_message || 'Hi! How can I help you?'}
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-5 border-t border-primary-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2.5 text-[14px] font-medium text-primary-600 bg-primary-100 rounded-apple hover:bg-primary-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formData.name.trim() || createMutation.isPending || updateMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 text-[14px] font-medium bg-accent-500 text-white rounded-apple hover:bg-accent-600 disabled:opacity-50 transition-colors"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {editingBot ? 'Save Changes' : 'Create Chatbot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Embed Code Modal */}
      {showEmbed && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-apple-lg w-full max-w-lg shadow-modal">
            <div className="p-5 border-b border-primary-200 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-primary-600">Embed Code</h2>
              <button onClick={() => setShowEmbed(null)} className="p-1.5 hover:bg-primary-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-primary-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-[14px] text-primary-500">
                Copy and paste this code into your website to embed the chatbot widget.
              </p>
              <div className="relative">
                <pre className="bg-primary-600 text-primary-100 p-4 rounded-apple text-[13px] overflow-x-auto">
                  {embedData?.data?.embed_code || 'Loading...'}
                </pre>
                <button
                  onClick={copyEmbed}
                  className="absolute top-2 right-2 p-2 bg-primary-500 hover:bg-primary-400 rounded-lg text-white transition-colors"
                >
                  {copiedEmbed ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chatbots Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-accent-500" />
        </div>
      ) : !chatbotsData?.data || chatbotsData.data.length === 0 ? (
        <div className="bg-white rounded-apple-lg p-12 text-center border border-primary-200 shadow-card">
          <Bot className="w-12 h-12 text-primary-300 mx-auto mb-4" />
          <h3 className="text-[17px] font-semibold text-primary-600 mb-2">No chatbots yet</h3>
          <p className="text-[14px] text-primary-400 mb-5">
            Create your first chatbot and select which knowledge departments it should use
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-500 text-white text-[14px] font-medium rounded-apple hover:bg-accent-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create First Chatbot
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {chatbotsData.data.map((bot) => (
            <div
              key={bot.id}
              className="bg-white rounded-apple-lg p-5 border border-primary-200 hover:border-accent-500/30 shadow-card hover:shadow-elevated transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-apple flex items-center justify-center shadow-subtle"
                    style={{ backgroundColor: bot.primary_color }}
                  >
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-primary-600">{bot.name}</h3>
                    <p className="text-[13px] text-primary-400">{bot.slug}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 text-[11px] font-medium rounded-full ${
                  bot.is_active
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'bg-primary-100 text-primary-500 border border-primary-200'
                }`}>
                  {bot.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {bot.description && (
                <p className="text-[13px] text-primary-500 mb-3 line-clamp-2">
                  {bot.description}
                </p>
              )}

              {/* Departments */}
              <div className="mb-4">
                <p className="text-[11px] text-primary-400 mb-2">Knowledge Sources:</p>
                <div className="flex flex-wrap gap-1.5">
                  {bot.departments?.length > 0 ? (
                    bot.departments.map((dept) => (
                      <span
                        key={dept.id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-600 rounded-md text-[11px]"
                      >
                        <Folder className="w-3 h-3" />
                        {dept.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-amber-600">No departments selected</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-primary-100">
                <button
                  onClick={() => handleEdit(bot)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[13px] text-primary-600 hover:bg-primary-100 rounded-apple transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => setShowEmbed(bot.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[13px] text-primary-600 hover:bg-primary-100 rounded-apple transition-colors"
                >
                  <Code className="w-4 h-4" />
                  Embed
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${bot.name}"?`)) {
                      deleteMutation.mutate(bot.id)
                    }
                  }}
                  className="p-2 text-primary-400 hover:text-red-600 hover:bg-red-50 rounded-apple transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
