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
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="text-gray-500 mt-1">Organize your knowledge by department</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Department
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search departments..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Create Department Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create Department</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department Name
                </label>
                <input
                  type="text"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="e.g., Sales, Support, Billing"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newDeptDesc}
                  onChange={(e) => setNewDeptDesc(e.target.value)}
                  placeholder="What kind of knowledge will this department contain?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newDeptName.trim() || createMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
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
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : filteredDepts.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No departments yet</h3>
          <p className="text-gray-500 mb-4">
            Create departments to organize your knowledge base by topic or team
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            Create First Department
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepts.map((dept) => {
            const docCount = getDocCountForDept(dept.id)
            return (
              <div
                key={dept.id}
                className="bg-white rounded-xl p-5 border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-50 rounded-lg group-hover:bg-primary-100 transition-colors">
                      <Folder className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                      <p className="text-sm text-gray-500">{dept.slug}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${dept.name}"? This will unlink all documents from this department.`)) {
                        deleteMutation.mutate(dept.id)
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {dept.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {dept.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
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
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-medium text-blue-900 mb-2">💡 How departments work</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Each department can contain multiple knowledge documents</li>
          <li>• When you create a chatbot, you can select which departments it should use</li>
          <li>• This allows you to create specialized chatbots (e.g., Sales Bot, Support Bot)</li>
          <li>• Go to <strong>Knowledge Upload</strong> to add documents to departments</li>
        </ul>
      </div>
    </div>
  )
}
