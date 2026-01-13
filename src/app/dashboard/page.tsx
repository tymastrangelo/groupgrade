'use client';

import { signOut, useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { LogOut, BookOpen, Users } from 'lucide-react';

export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-indigo-600">GroupGrade</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">
              Welcome, <span className="font-semibold">{session?.user?.name}</span>
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Professors Section */}
          <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="text-blue-600" size={28} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">For Professors</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Create and manage group projects, assign teams, and track progress
            </p>
            <ul className="space-y-2 text-gray-700 mb-6">
              <li>✓ Create new projects</li>
              <li>✓ Manage student groups</li>
              <li>✓ Grade submissions</li>
              <li>✓ View class analytics</li>
            </ul>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200">
              Go to Professor Dashboard
            </button>
          </div>

          {/* Students Section */}
          <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <BookOpen className="text-green-600" size={28} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">For Students</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Join project groups, collaborate with teammates, and submit work
            </p>
            <ul className="space-y-2 text-gray-700 mb-6">
              <li>✓ Join project groups</li>
              <li>✓ Collaborate with peers</li>
              <li>✓ Submit assignments</li>
              <li>✓ Track grades</li>
            </ul>
            <button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200">
              Go to Student Dashboard
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Active Projects</p>
            <p className="text-3xl font-bold text-indigo-600 mt-2">0</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Assigned Groups</p>
            <p className="text-3xl font-bold text-indigo-600 mt-2">0</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Pending Submissions</p>
            <p className="text-3xl font-bold text-indigo-600 mt-2">0</p>
          </div>
        </div>
      </main>
    </div>
  );
}
