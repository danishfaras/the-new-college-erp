'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'

export default function StaffNotificationsPage() {
  const { data: session } = useSession()

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', session?.user.id],
    queryFn: async () => {
      if (!session?.user.id) return null
      const res = await fetch('/api/notifications')
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!session?.user.id,
  })

  const notifications = notificationsData?.notifications || []
  const unreadCount = notifications.filter((n: any) => !n.read).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Notifications</h1>
              <p className="text-gray-400">Stay updated with important announcements</p>
            </div>
            {unreadCount > 0 && (
              <div className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30">
                <span className="text-amber-400 font-semibold">{unreadCount} Unread</span>
              </div>
            )}
          </div>
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
            <p className="mt-4 text-gray-400">Loading notifications...</p>
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-4">
            {notifications.map((notification: any) => (
              <div
                key={notification.id}
                className={`backdrop-blur-xl rounded-2xl border p-6 transition-all duration-200 ${
                  notification.read
                    ? 'bg-white/5 border-white/10'
                    : 'bg-amber-500/10 border-amber-500/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-white font-bold text-lg">{notification.title}</h3>
                      {!notification.read && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-gray-300 mb-3">{notification.message}</p>
                    <p className="text-gray-500 text-sm">
                      {new Date(notification.createdAt).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {notification.link && (
                      <a
                        href={notification.link}
                        className="inline-block mt-3 text-blue-400 hover:text-blue-300 text-sm font-medium"
                      >
                        View Details →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-500/20 mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-gray-400 text-lg">No notifications</p>
            <p className="text-gray-500 text-sm mt-2">You're all caught up! New notifications will appear here</p>
          </div>
        )}
      </main>
    </div>
  )
}
