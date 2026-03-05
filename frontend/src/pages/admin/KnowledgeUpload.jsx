import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { knowledgeAPI, organizationsAPI } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'
import {
  Upload,
  FileText,
  File,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Trash2,
  Eye,
} from 'lucide-react'
import { format } from 'date-fns'

const statusColors = {
  pending: { bg: 'bg-primary-100', text: 'text-primary-500', icon: Clock },
  processing: { bg: 'bg-blue-50', text: 'text-blue-600', icon: Loader2 },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: CheckCircle },
  failed: { bg: 'bg-red-50', text: 'text-red-600', icon: XCircle },
}

const typeColors = {
  faq: 'bg-purple-50 text-purple-700',
  policy: 'bg-blue-50 text-blue-700',
  troubleshooting: 'bg-amber-50 text-amber-700',
  sales: 'bg-emerald-50 text-emerald-700',
  general: 'bg-primary-100 text-primary-500',
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
    refetchInterval: 5000, // Poll for status updates
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
          <h1 className="text-[28px] font-semibold text-primary-600 tracking-tight">Knowledge</h1>
          <p className="text-[15px] text-primary-400 mt-1">Upload and manage documents</p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-apple p-6 border border-primary-200">
        <h2 className="text-[17px] font-semibold text-primary-600 mb-4">Upload Document</h2>
        
        <div className="flex items-center gap-4 mb-4">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-4 py-2.5 bg-primary-50 border border-primary-200 rounded-apple text-[14px] text-primary-600 focus:bg-white focus:border-primary-300 transition-colors"
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
          className="border-2 border-dashed border-primary-200 rounded-apple p-8 text-center cursor-pointer hover:border-accent-500 hover:bg-accent-500/5 transition-colors"
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
              <Loader2 className="w-10 h-10 text-accent-500 animate-spin" />
              <p className="text-[14px] text-primary-500">Uploading...</p>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-primary-300 mx-auto mb-4" />
              <p className="text-[14px] font-medium text-primary-500">Click to upload or drag and drop</p>
              <p className="text-[12px] text-primary-400 mt-1">PDF, DOCX, TXT, CSV, JSON (max 50MB)</p>
            </>
          )}
        </div>
      </div>

      {/* Documents List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-[17px] font-semibold text-primary-600">Documents</h2>

          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-accent-500" />
            </div>
          ) : docsData?.data?.length === 0 ? (
            <div className="bg-white rounded-apple p-8 text-center border border-primary-200">
              <FileText className="w-10 h-10 text-primary-300 mx-auto mb-4" />
              <p className="text-[14px] text-primary-400">No documents uploaded yet</p>
            </div>
          ) : (
            docsData?.data?.map((doc) => {
              const StatusIcon = statusColors[doc.processing_status]?.icon || Clock
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`bg-white rounded-apple p-4 border cursor-pointer transition-all ${
                    selectedDoc?.id === doc.id
                      ? 'border-accent-500 shadow-subtle'
                      : 'border-primary-200 hover:border-primary-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary-100 rounded-apple">
                        <File className="w-5 h-5 text-primary-500" />
                      </div>
                      <div>
                        <h3 className="text-[14px] font-medium text-primary-600">{doc.title}</h3>
                        <p className="text-[12px] text-primary-400">
                          {doc.original_filename} • {doc.file_type?.toUpperCase()}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${statusColors[doc.processing_status]?.bg} ${statusColors[doc.processing_status]?.text}`}>
                            <StatusIcon className={`w-3 h-3 ${doc.processing_status === 'processing' ? 'animate-spin' : ''}`} />
                            {doc.processing_status}
                          </span>
                          {doc.knowledge_type && (
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${typeColors[doc.knowledge_type]}`}>
                              {doc.knowledge_type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {doc.processing_status === 'failed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            reprocessMutation.mutate(doc.id)
                          }}
                          className="p-1.5 text-primary-400 hover:text-accent-500 rounded-lg hover:bg-primary-100 transition-colors"
                          title="Reprocess"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm('Delete this document?')) {
                            deleteMutation.mutate(doc.id)
                          }
                        }}
                        className="p-1.5 text-primary-400 hover:text-red-500 rounded-lg hover:bg-primary-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
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
          <h2 className="text-[17px] font-semibold text-primary-600">Details</h2>
          
          {selectedDoc ? (
            <div className="bg-white rounded-apple p-5 border border-primary-200 space-y-4">
              <div>
                <p className="text-[12px] text-primary-400">Title</p>
                <p className="text-[14px] font-medium text-primary-600 mt-0.5">{selectedDoc.title}</p>
              </div>
              <div>
                <p className="text-[12px] text-primary-400">Status</p>
                <p className="text-[14px] font-medium text-primary-600 capitalize mt-0.5">{selectedDoc.processing_status}</p>
              </div>
              {selectedDoc.knowledge_type && (
                <div>
                  <p className="text-[12px] text-primary-400">Type</p>
                  <p className="text-[14px] font-medium text-primary-600 capitalize mt-0.5">{selectedDoc.knowledge_type}</p>
                </div>
              )}
              <div>
                <p className="text-[12px] text-primary-400">Uploaded</p>
                <p className="text-[14px] font-medium text-primary-600 mt-0.5">
                  {format(new Date(selectedDoc.created_at), 'PPp')}
                </p>
              </div>
              {selectedDoc.processing_error && (
                <div>
                  <p className="text-[12px] text-primary-400">Error</p>
                  <p className="text-[13px] text-red-600 mt-0.5">{selectedDoc.processing_error}</p>
                </div>
              )}
              {selectedDoc.structured_content && (
                <div>
                  <p className="text-[12px] text-primary-400 mb-2">Structured Content</p>
                  <pre className="text-[11px] bg-primary-50 p-3 rounded-apple overflow-auto max-h-64 text-primary-600">
                    {JSON.stringify(selectedDoc.structured_content, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-primary-50 rounded-apple p-8 text-center border border-primary-200">
              <Eye className="w-10 h-10 text-primary-300 mx-auto mb-4" />
              <p className="text-[14px] text-primary-400">Select a document to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
