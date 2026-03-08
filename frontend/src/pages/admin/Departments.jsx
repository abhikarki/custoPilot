import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { organizationsAPI, knowledgeAPI } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'

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
      <div className="bg-warning-50 border border-warning-100 rounded-lg p-6 text-center">
        <p className="text-sm text-warning-700">No organization found. Please log out and register again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Departments</h1>
          <p className="text-sm text-slate-500 mt-1">Organize your knowledge by department</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700 transition-colors"
        >
          Add Department
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search departments..."
          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 transition-colors"
        />
      </div>

      {/* Create Department Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900 mb-5">Create Department</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Department Name
                </label>
                <input
                  type="text"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="e.g., Sales, Support, Billing"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:bg-white focus:border-brand-500 transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Description (optional)
                </label>
                <textarea
                  value={newDeptDesc}
                  onChange={(e) => setNewDeptDesc(e.target.value)}
                  placeholder="What kind of knowledge will this department contain?"
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:bg-white focus:border-brand-500 transition-colors"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newDeptName.trim() || createMutation.isPending}
                  className="px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Departments Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredDepts.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center border border-slate-200">
          <h3 className="text-base font-semibold text-slate-900 mb-2">No departments yet</h3>
          <p className="text-sm text-slate-500 mb-5">
            Create departments to organize your knowledge base by topic or team
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700 transition-colors"
          >
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
                className="bg-white rounded-lg p-5 border border-slate-200 hover:border-slate-300 transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{dept.name}</h3>
                    <p className="text-xs text-slate-500 font-mono">{dept.slug}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${dept.name}"? This will unlink all documents from this department.`)) {
                        deleteMutation.mutate(dept.id)
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="text-xs text-slate-400 hover:text-danger-600 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    Delete
                  </button>
                </div>

                {dept.description && (
                  <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                    {dept.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    {docCount} document{docCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-slate-700 mb-2">How departments work</h3>
        <ul className="text-xs text-slate-500 space-y-1">
          <li>Each department can contain multiple knowledge documents</li>
          <li>When creating a chatbot, select which departments it should use</li>
          <li>This allows specialized chatbots (e.g., Sales Bot, Support Bot)</li>
          <li>Go to Knowledge Base to add documents to departments</li>
        </ul>
      </div>
    </div>
  )
}
