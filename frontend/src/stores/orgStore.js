import { create } from 'zustand'

export const useOrgStore = create((set, get) => ({
  organizations: [],
  currentOrg: null,
  departments: [],
  isLoading: false,

  setOrganizations: (organizations) => set({ organizations }),

  setCurrentOrg: (org) => {
    set({ currentOrg: org })
    if (org) {
      localStorage.setItem('current_org_id', org.id)
    }
  },

  setDepartments: (departments) => set({ departments }),

  setLoading: (isLoading) => set({ isLoading }),

  loadCurrentOrg: () => {
    const orgId = localStorage.getItem('current_org_id')
    const { organizations } = get()
    if (orgId && organizations.length > 0) {
      const org = organizations.find((o) => o.id === orgId)
      if (org) {
        set({ currentOrg: org })
      }
    }
  },
}))
