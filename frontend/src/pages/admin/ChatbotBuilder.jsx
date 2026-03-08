import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chatbotsAPI, organizationsAPI, knowledgeAPI } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'

const colorPresets = [
  '#4f46e5', // Indigo
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#dc2626', // Red
  '#ea580c', // Orange
  '#ca8a04', // Yellow
  '#16a34a', // Green
  '#0d9488', // Teal
  '#0284c7', // Sky
  '#2563eb', // Blue
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
      <div className="bg-warning-50 border border-warning-200 rounded-md p-6 text-center">
        <p className="text-sm text-warning-700">No organization found. Please log out and register again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Chatbots</h1>
          <p className="text-sm text-slate-500 mt-1">Create and configure AI chatbots</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2.5 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          Create Chatbot
        </button>
      </div>

      {/* Create/Edit Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white rounded-t-lg">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingBot ? 'Edit Chatbot' : 'Create Chatbot'}
              </h2>
              <button onClick={resetForm} className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-500">
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-slate-900">Basic Info</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Chatbot Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Sales Assistant"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-brand-500 transition-colors"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="What does this chatbot help with?"
                      rows={2}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-brand-500 resize-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Knowledge Sources (Departments & Documents) */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-slate-900">Knowledge Sources</h3>
                <p className="text-xs text-slate-500">
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
                        <div key={dept.id} className="border border-slate-200 rounded-md overflow-hidden">
                          {/* Department Header */}
                          <div className={`flex items-center p-3 ${isDeptSelected ? 'bg-brand-50' : 'bg-white'}`}>
                            <button
                              type="button"
                              onClick={() => toggleDepartment(dept.id)}
                              className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${
                                isDeptSelected
                                  ? 'bg-brand-600 border-brand-600 text-white'
                                  : 'border-slate-300'
                              }`}
                            >
                              {isDeptSelected && <span className="text-xs">✓</span>}
                            </button>
                            <div className="flex-1" onClick={() => toggleDepartment(dept.id)}>
                              <p className="text-sm font-medium text-slate-900">{dept.name}</p>
                              <p className="text-xs text-slate-500">
                                {deptDocs.length} documents
                                {selectedDocsInDept > 0 && isDeptSelected && ` (${selectedDocsInDept} selected)`}
                              </p>
                            </div>
                            {isDeptSelected && deptDocs.length > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleExpandDept(dept.id)}
                                className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-400 text-xs"
                              >
                                {isExpanded ? '▼' : '▶'}
                              </button>
                            )}
                          </div>
                          
                          {/* Documents List */}
                          {isExpanded && isDeptSelected && deptDocs.length > 0 && (
                            <div className="border-t border-slate-200 bg-slate-50 p-3 space-y-2">
                              <p className="text-xs text-slate-400 mb-2">
                                Select specific documents (leave unchecked to use all):
                              </p>
                              {deptDocs.map((doc) => (
                                <button
                                  key={doc.id}
                                  type="button"
                                  onClick={() => toggleDocument(doc.id)}
                                  className={`flex items-center gap-2 w-full p-2.5 rounded-md text-left text-xs transition-colors ${
                                    formData.document_ids.includes(doc.id)
                                      ? 'bg-brand-100 text-brand-600'
                                      : 'bg-white hover:bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  <span className="truncate">{doc.title || doc.original_filename}</span>
                                  {formData.document_ids.includes(doc.id) && (
                                    <span className="ml-auto flex-shrink-0">✓</span>
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
                  <div className="text-xs text-warning-700 bg-warning-50 p-3 rounded-md border border-warning-200">
                    No departments created yet. Create departments first.
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-slate-900">Messages</h3>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    Welcome Message
                  </label>
                  <input
                    type="text"
                    value={formData.welcome_message}
                    onChange={(e) => setFormData({ ...formData, welcome_message: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:bg-white focus:border-brand-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    System Prompt (Advanced)
                  </label>
                  <textarea
                    value={formData.system_prompt}
                    onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                    placeholder="Custom instructions for the AI (e.g., tone, specific rules)"
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 font-mono focus:bg-white focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-slate-900">Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-md p-4">
                    <label className="block text-xs font-medium text-slate-500 mb-2">
                      Temperature: <span className="text-brand-600">{formData.temperature}</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={formData.temperature}
                      onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                      className="w-full accent-brand-600"
                    />
                    <p className="text-xs text-slate-400 mt-1.5">
                      Lower = more focused, Higher = more creative
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-md p-4">
                    <label className="block text-xs font-medium text-slate-500 mb-2">
                      Escalation Threshold: <span className="text-brand-600">{formData.confidence_threshold}</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={formData.confidence_threshold}
                      onChange={(e) => setFormData({ ...formData, confidence_threshold: parseFloat(e.target.value) })}
                      className="w-full accent-brand-600"
                    />
                    <p className="text-xs text-slate-400 mt-1.5">
                      Below this confidence → escalate to human
                    </p>
                  </div>
                </div>
              </div>

              {/* Appearance */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-slate-900">Appearance</h3>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-3">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-3 flex-wrap">
                    {colorPresets.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, primary_color: color })}
                        className={`w-9 h-9 rounded-md transition-all duration-200 ${
                          formData.primary_color === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="w-9 h-9 rounded-md cursor-pointer border-2 border-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-slate-50 rounded-md p-5">
                <h4 className="text-xs font-medium text-slate-500 mb-3">Preview</h4>
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: formData.primary_color }}
                  >
                    <span className="text-white font-semibold">AI</span>
                  </div>
                  <div
                    className="px-4 py-2.5 rounded-lg text-white text-sm max-w-xs"
                    style={{ backgroundColor: formData.primary_color }}
                  >
                    {formData.welcome_message || 'Hi! How can I help you?'}
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formData.name.trim() || createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2.5 text-sm font-medium bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : editingBot ? 'Save Changes' : 'Create Chatbot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Embed Code Modal */}
      {showEmbed && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg shadow-lg">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Embed Code</h2>
              <button onClick={() => setShowEmbed(null)} className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-500">
                ×
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600">
                Copy and paste this code into your website to embed the chatbot widget.
              </p>
              <div className="relative">
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-md text-xs overflow-x-auto">
                  {embedData?.data?.embed_code || 'Loading...'}
                </pre>
                <button
                  onClick={copyEmbed}
                  className="absolute top-2 right-2 p-2 bg-slate-700 hover:bg-slate-600 rounded-md text-white transition-colors text-xs"
                >
                  {copiedEmbed ? '✓' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chatbots Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !chatbotsData?.data || chatbotsData.data.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center border border-slate-200">
          <h3 className="text-base font-semibold text-slate-900 mb-2">No chatbots yet</h3>
          <p className="text-sm text-slate-500 mb-5">
            Create your first chatbot and select which knowledge departments it should use
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700 transition-colors"
          >
            Create First Chatbot
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {chatbotsData.data.map((bot) => (
            <div
              key={bot.id}
              className="bg-white rounded-lg p-5 border border-slate-200 hover:border-brand-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: bot.primary_color }}
                  >
                    <span className="text-white font-semibold text-lg">{bot.name.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{bot.name}</h3>
                    <p className="text-xs text-slate-500">{bot.slug}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 text-xs font-medium rounded ${
                  bot.is_active
                    ? 'bg-success-50 text-success-600 border border-success-200'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}>
                  {bot.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {bot.description && (
                <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                  {bot.description}
                </p>
              )}

              {/* Departments */}
              <div className="mb-4">
                <p className="text-xs text-slate-400 mb-2">Knowledge Sources:</p>
                <div className="flex flex-wrap gap-1.5">
                  {bot.departments?.length > 0 ? (
                    bot.departments.map((dept) => (
                      <span
                        key={dept.id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs"
                      >
                        {dept.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-warning-600">No departments selected</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleEdit(bot)}
                  className="flex-1 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setShowEmbed(bot.id)}
                  className="flex-1 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Embed
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${bot.name}"?`)) {
                      deleteMutation.mutate(bot.id)
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-danger-600 hover:bg-danger-50 rounded-md transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
