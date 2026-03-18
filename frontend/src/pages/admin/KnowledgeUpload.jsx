import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { knowledgeAPI, organizationsAPI } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'
import { format } from 'date-fns'

const statusStyles = {
  pending: { bg: 'bg-slate-100', text: 'text-slate-600' },
  processing: { bg: 'bg-slate-100', text: 'text-slate-600' },
  completed: { bg: 'bg-slate-100', text: 'text-slate-700' },
  failed: { bg: 'bg-slate-100', text: 'text-slate-600' },
}

const typeStyles = {
  faq: 'bg-slate-100 text-slate-700',
  policy: 'bg-slate-100 text-slate-700',
  troubleshooting: 'bg-slate-100 text-slate-700',
  sales: 'bg-slate-100 text-slate-700',
  general: 'bg-slate-100 text-slate-600',
}

export default function KnowledgeUpload() {
  const { getOrganizationId } = useAuthStore()
  const organizationId = getOrganizationId()
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedDoc, setSelectedDoc] = useState(null)
  const fileInputRef = useRef(null)
  const queryClient = useQueryClient()

  const { data: deptsData } = useQuery({
    queryKey: ['departments', organizationId],
    queryFn: () => organizationsAPI.listDepartments(organizationId),
    enabled: !!organizationId,
  })

  const { data: docsData, isLoading } = useQuery({
    queryKey: ['knowledge', organizationId, selectedDept],
    queryFn: () => knowledgeAPI.list(organizationId, { department_id: selectedDept || undefined }),
    enabled: !!organizationId,
    refetchInterval: 5000,
  })

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('organization_id', organizationId)
      if (selectedDept) {
        formData.append('department_id', selectedDept)
      }
      formData.append('title', file.name)
      return knowledgeAPI.upload(organizationId, formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['knowledge'])
      fileInputRef.current.value = ''
    },
  })

  const reprocessMutation = useMutation({
    mutationFn: (docId) => knowledgeAPI.reprocess(docId),
    onSuccess: () => {
      queryClient.invalidateQueries(['knowledge'])
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (docId) => knowledgeAPI.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries(['knowledge'])
      setSelectedDoc(null)
    },
  })

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      uploadMutation.mutate(file)
    }
  }

  if (!organizationId) {
    return (
      <div className="bg-slate-100 border border-slate-200 rounded-lg p-6 text-center">
        <p className="text-sm text-slate-600">No organization found. Please log out and register again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Knowledge Base</h1>
        <p className="text-sm text-slate-500 mt-1">Upload and manage documents</p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg p-5 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Upload Document</h2>
        
        <div className="flex items-center gap-4 mb-4">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:bg-white focus:border-slate-400 transition-colors"
          >
            <option value="">All Departments</option>
            {deptsData?.data?.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-50/50 transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.docx,.txt,.csv,.json"
            className="hidden"
          />
          {uploadMutation.isPending ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin" />
              <p className="text-sm text-slate-600">Uploading...</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-600">Click to upload or drag and drop</p>
              <p className="text-xs text-slate-400 mt-1">PDF, DOCX, TXT, CSV, JSON (max 50MB)</p>
            </>
          )}
        </div>
      </div>

      {/* Documents List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Documents</h2>

          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin" />
            </div>
          ) : docsData?.data?.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center border border-slate-200">
              <p className="text-sm text-slate-500">No documents uploaded yet</p>
            </div>
          ) : (
            docsData?.data?.map((doc) => {
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`bg-white rounded-lg p-4 border cursor-pointer transition-all ${
                    selectedDoc?.id === doc.id
                      ? 'border-brand-500 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-slate-900">{doc.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {doc.original_filename} · {doc.file_type?.toUpperCase()}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusStyles[doc.processing_status]?.bg} ${statusStyles[doc.processing_status]?.text}`}>
                          {doc.processing_status}
                        </span>
                        {doc.knowledge_type && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeStyles[doc.knowledge_type]}`}>
                            {doc.knowledge_type}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.processing_status === 'failed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            reprocessMutation.mutate(doc.id)
                          }}
                          className="text-xs text-slate-700 hover:text-slate-900 font-medium"
                        >
                          Retry
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm('Delete this document?')) {
                            deleteMutation.mutate(doc.id)
                          }
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Document Details */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Details</h2>
          
          {selectedDoc ? (
            <div className="bg-white rounded-lg p-5 border border-slate-200 space-y-4">
              <div>
                <p className="text-xs text-slate-500">Title</p>
                <p className="text-sm font-medium text-slate-900 mt-0.5">{selectedDoc.title}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <p className="text-sm font-medium text-slate-900 capitalize mt-0.5">{selectedDoc.processing_status}</p>
              </div>
              {selectedDoc.knowledge_type && (
                <div>
                  <p className="text-xs text-slate-500">Type</p>
                  <p className="text-sm font-medium text-slate-900 capitalize mt-0.5">{selectedDoc.knowledge_type}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500">Uploaded</p>
                <p className="text-sm font-medium text-slate-900 mt-0.5">
                  {format(new Date(selectedDoc.created_at), 'PPp')}
                </p>
              </div>
              {selectedDoc.processing_error && (
                <div>
                  <p className="text-xs text-slate-500">Error</p>
                  <p className="text-xs text-danger-600 mt-0.5">{selectedDoc.processing_error}</p>
                </div>
              )}
              {selectedDoc.structured_content && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Structured Content</p>
                  <pre className="text-xs bg-slate-50 p-3 rounded-md overflow-auto max-h-64 text-slate-700 font-mono">
                    {JSON.stringify(selectedDoc.structured_content, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-lg p-8 text-center border border-slate-200">
              <p className="text-sm text-slate-500">Select a document to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
