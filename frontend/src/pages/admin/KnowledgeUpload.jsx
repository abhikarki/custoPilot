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
  Search,
  Eye,
} from 'lucide-react'
import { format } from 'date-fns'

const statusColors = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-600', icon: Clock },
  processing: { bg: 'bg-blue-100', text: 'text-blue-600', icon: Loader2 },
  completed: { bg: 'bg-green-100', text: 'text-green-600', icon: CheckCircle },
  failed: { bg: 'bg-red-100', text: 'text-red-600', icon: XCircle },
}

const typeColors = {
  faq: 'bg-purple-100 text-purple-700',
  policy: 'bg-blue-100 text-blue-700',
  troubleshooting: 'bg-amber-100 text-amber-700',
  sales: 'bg-green-100 text-green-700',
  general: 'bg-gray-100 text-gray-700',
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
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <p className="text-amber-700">No organization found. Please log out and register again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Upload</h1>
          <p className="text-gray-500 mt-1">Upload and manage knowledge documents</p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h2>
        
        <div className="flex items-center gap-4 mb-4">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
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
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-500 transition-colors"
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
              <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
              <p className="text-gray-600">Uploading...</p>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Click to upload or drag and drop</p>
              <p className="text-sm text-gray-500 mt-1">PDF, DOCX, TXT, CSV, JSON (max 50MB)</p>
            </>
          )}
        </div>
      </div>

      {/* Documents List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Documents</h2>

          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : docsData?.data?.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No documents uploaded yet</p>
            </div>
          ) : (
            docsData?.data?.map((doc) => {
              const StatusIcon = statusColors[doc.processing_status]?.icon || Clock
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`bg-white rounded-xl p-4 border cursor-pointer transition-all ${
                    selectedDoc?.id === doc.id
                      ? 'border-primary-500 ring-2 ring-primary-100'
                      : 'border-gray-200 hover:border-primary-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <File className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{doc.title}</h3>
                        <p className="text-sm text-gray-500">
                          {doc.original_filename} • {doc.file_type?.toUpperCase()}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[doc.processing_status]?.bg} ${statusColors[doc.processing_status]?.text}`}>
                            <StatusIcon className={`w-3 h-3 ${doc.processing_status === 'processing' ? 'animate-spin' : ''}`} />
                            {doc.processing_status}
                          </span>
                          {doc.knowledge_type && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[doc.knowledge_type]}`}>
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
                          className="p-1 text-gray-400 hover:text-primary-600 rounded"
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
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
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
          <h2 className="text-lg font-semibold text-gray-900">Document Details</h2>
          
          {selectedDoc ? (
            <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-4">
              <div>
                <p className="text-sm text-gray-500">Title</p>
                <p className="font-medium">{selectedDoc.title}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium capitalize">{selectedDoc.processing_status}</p>
              </div>
              {selectedDoc.knowledge_type && (
                <div>
                  <p className="text-sm text-gray-500">Knowledge Type</p>
                  <p className="font-medium capitalize">{selectedDoc.knowledge_type}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Uploaded</p>
                <p className="font-medium">
                  {format(new Date(selectedDoc.created_at), 'PPp')}
                </p>
              </div>
              {selectedDoc.processing_error && (
                <div>
                  <p className="text-sm text-gray-500">Error</p>
                  <p className="text-sm text-red-600">{selectedDoc.processing_error}</p>
                </div>
              )}
              {selectedDoc.structured_content && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Structured Content</p>
                  <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-auto max-h-64">
                    {JSON.stringify(selectedDoc.structured_content, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
              <Eye className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Select a document to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
