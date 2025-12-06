'use client'

import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import Link from 'next/link'
import { useState } from 'react'

export default function AdminClassesPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingClass, setEditingClass] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    department: '',
    staffIds: [] as string[],
  })

  const { data: classesData, isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await fetch('/api/classes')
      if (!res.ok) return null
      return res.json()
    },
  })

  const { data: staffData } = useQuery({
    queryKey: ['users', 'staff'],
    queryFn: async () => {
      const res = await fetch('/api/users?role=staff')
      if (!res.ok) return null
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create class')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      setShowCreateModal(false)
      setFormData({ name: '', code: '', department: '', staffIds: [] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/classes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update class')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      setEditingClass(null)
      setFormData({ name: '', code: '', department: '', staffIds: [] })
    },
  })

  const handleEdit = (cls: any) => {
    setEditingClass(cls)
    setFormData({
      name: cls.name,
      code: cls.code,
      department: cls.department,
      staffIds: cls.staffIds || [],
    })
    setShowCreateModal(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingClass) {
      updateMutation.mutate({ id: editingClass.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const filteredClasses = classesData?.classes?.filter((cls: any) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      cls.name?.toLowerCase().includes(query) ||
      cls.code?.toLowerCase().includes(query) ||
      cls.department?.toLowerCase().includes(query)
    )
  }) || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Class Management</h1>
              <p className="text-gray-400">Create and manage classes, assign staff</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/admin"
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all duration-200 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back</span>
              </Link>
              <button
                onClick={() => {
                  setEditingClass(null)
                  setFormData({ name: '', code: '', department: '', staffIds: [] })
                  setShowCreateModal(true)
                }}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Create Class</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-12 pr-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
            />
          </div>
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <div className="col-span-full text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
              <p className="mt-4 text-gray-400">Loading classes...</p>
            </div>
          ) : filteredClasses.length > 0 ? (
            filteredClasses.map((cls: any) => (
              <div
                key={cls.id}
                className="group backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{cls.name}</h3>
                    <p className="text-gray-400 text-sm mb-2">Code: {cls.code}</p>
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      {cls.department}
                    </span>
                  </div>
                  <button
                    onClick={() => handleEdit(cls)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Staff Members</span>
                    <span className="text-white font-semibold">{cls.staff?.length || 0}</span>
                  </div>
                  {cls.staff && cls.staff.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {cls.staff.map((staff: any) => (
                        <span
                          key={staff.id}
                          className="px-2 py-1 rounded-lg text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        >
                          {staff.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-white/10">
                    <span className="text-gray-400">Timetables</span>
                    <span className="text-white font-semibold">{cls._count?.timetables || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Exams</span>
                    <span className="text-white font-semibold">{cls._count?.exams || 0}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-500/20 mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-gray-400 text-lg">No classes found</p>
              <p className="text-gray-500 text-sm mt-2">Create your first class to get started</p>
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="backdrop-blur-xl bg-slate-800/90 rounded-2xl border border-white/20 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">
                    {editingClass ? 'Edit Class' : 'Create New Class'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setEditingClass(null)
                      setFormData({ name: '', code: '', department: '', staffIds: [] })
                    }}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Class Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="block w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
                    placeholder="e.g., BSc CS 2nd Year"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Class Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="block w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
                    placeholder="e.g., BSC-CS-2"
                    disabled={!!editingClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Department</label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="block w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
                    placeholder="e.g., Computer Science"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Assign Staff</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {staffData?.users?.map((staff: any) => (
                      <label
                        key={staff.id}
                        className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-all duration-200"
                      >
                        <input
                          type="checkbox"
                          checked={formData.staffIds.includes(staff.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, staffIds: [...formData.staffIds, staff.id] })
                            } else {
                              setFormData({ ...formData, staffIds: formData.staffIds.filter((id: string) => id !== staff.id) })
                            }
                          }}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/50"
                        />
                        <div>
                          <p className="text-white font-medium">{staff.name}</p>
                          <p className="text-gray-400 text-sm">{staff.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-4 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      setEditingClass(null)
                      setFormData({ name: '', code: '', department: '', staffIds: [] })
                    }}
                    className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Saving...'
                      : editingClass
                      ? 'Update Class'
                      : 'Create Class'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
