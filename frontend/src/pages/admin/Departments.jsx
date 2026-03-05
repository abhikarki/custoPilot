import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { organizationsAPI, knowledgeAPI } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'
import {
  Plus,
  Folder,
  Trash2,
  FileText,
  Loader2,
  Search,
  MoreVertical,
  Edit,
  FolderOpen,
} from 'lucide-react'

export default function Departments() {
  const { getOrganizationId } = useAuthStore()
  const organizationId = getOrganizationId()
  const [showCreate, setShowCreate] = useState(false)
  const [newDeptName, setNewDeptName] = useState('')
  const [newDeptDesc, setNewDeptDesc] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const queryClient = useQueryClient()

  const { data: deptsData, isLoading } = useQuery({
    queryKey: ['departments', organizationId],
    queryFn: () => organizationsAPI.listDepartments(organizationId),
    enabled: !!organizationId,
  })

  const { data: docsData } = useQuery({
    queryKey: ['knowledge', organizationId],
    queryFn: () => knowledgeAPI.list(organizationId),
    enabled: !!organizationId,
  })

  const createMutation = useMutation({
    mutationFn: (data) => organizationsAPI.createDepartment(organizationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['departments'])
      setShowCreate(false)
      setNewDeptName('')
      setNewDeptDesc('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (deptId) => organizationsAPI.deleteDepartment(organizationId, deptId),
    onSuccess: () => {
      queryClient.invalidateQueries(['departments'])
    },
  })

  const handleCreate = (e) => {
    e.preventDefault()
    if (!newDeptName.trim()) return
    createMutation.mutate({
      name: newDeptName.trim(),
      description: newDeptDesc.trim() || null,
    })
  }

  const getDocCountForDept = (deptId) => {
    if (!docsData?.data) return 0
    return docsData.data.filter(doc => doc.department_id === deptId).length
  }

  const filteredDepts = deptsData?.data?.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  if (!organizationId) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-apple p-6 text-center">
        <p className="text-[14px] text-amber-700">No organization found. Please log out and register again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-semibold text-primary-600">Departments</h1>
          <p className="text-[14px] text-primary-400 mt-1">Organize your knowledge by department</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-500 text-white text-[14px] font-medium rounded-apple hover:bg-accent-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Department
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search departments..."
          className="w-full pl-11 pr-4 py-2.5 bg-primary-50 border border-primary-200 rounded-apple text-[14px] text-primary-600 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition-colors"
        />
      </div>

      {/* Create Department Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-apple-lg p-6 w-full max-w-md shadow-modal">
            <h2 className="text-[17px] font-semibold text-primary-600 mb-5">Create Department</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-primary-500 mb-1.5">
                  Department Name
                </label>
                <input
                  type="text"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="e.g., Sales, Support, Billing"
                  className="w-full px-3.5 py-2.5 bg-primary-50 border border-primary-200 rounded-apple text-[14px] text-primary-600 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-primary-500 mb-1.5">
                  Description (optional)
                </label>
                <textarea
                  value={newDeptDesc}
                  onChange={(e) => setNewDeptDesc(e.target.value)}
                  placeholder="What kind of knowledge will this department contain?"
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-primary-50 border border-primary-200 rounded-apple text-[14px] text-primary-600 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition-colors"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2.5 text-[14px] font-medium text-primary-600 bg-primary-100 rounded-apple hover:bg-primary-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newDeptName.trim() || createMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2.5 text-[14px] font-medium bg-accent-500 text-white rounded-apple hover:bg-accent-600 disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Departments Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-accent-500" />
        </div>
      ) : filteredDepts.length === 0 ? (
        <div className="bg-white rounded-apple-lg p-12 text-center border border-primary-200 shadow-card">
          <FolderOpen className="w-12 h-12 text-primary-300 mx-auto mb-4" />
          <h3 className="text-[17px] font-semibold text-primary-600 mb-2">No departments yet</h3>
          <p className="text-[14px] text-primary-400 mb-5">
            Create departments to organize your knowledge base by topic or team
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-500 text-white text-[14px] font-medium rounded-apple hover:bg-accent-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create First Department
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDepts.map((dept) => {
            const docCount = getDocCountForDept(dept.id)
            return (
              <div
                key={dept.id}
                className="bg-white rounded-apple-lg p-5 border border-primary-200 hover:border-accent-500/30 shadow-card hover:shadow-elevated transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-accent-500/10 rounded-apple group-hover:bg-accent-500/15 transition-colors">
                      <Folder className="w-6 h-6 text-accent-600" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold text-primary-600">{dept.name}</h3>
                      <p className="text-[13px] text-primary-400">{dept.slug}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${dept.name}"? This will unlink all documents from this department.`)) {
                        deleteMutation.mutate(dept.id)
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 text-primary-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {dept.description && (
                  <p className="text-[13px] text-primary-500 mb-3 line-clamp-2">
                    {dept.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-primary-100">
                  <div className="flex items-center gap-2 text-[13px] text-primary-500">
                    <FileText className="w-4 h-4" />
                    <span>{docCount} document{docCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-accent-500/5 border border-accent-500/20 rounded-apple p-4">
        <h3 className="text-[14px] font-medium text-accent-600 mb-2">💡 How departments work</h3>
        <ul className="text-[13px] text-primary-500 space-y-1">
          <li>• Each department can contain multiple knowledge documents</li>
          <li>• When you create a chatbot, you can select which departments it should use</li>
          <li>• This allows you to create specialized chatbots (e.g., Sales Bot, Support Bot)</li>
          <li>• Go to <strong>Knowledge Upload</strong> to add documents to departments</li>
        </ul>
      </div>
    </div>
  )
}
