'use client';

import { signIn } from 'next-auth/react';
import { FcGoogle } from 'react-icons/fc';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">GroupGrade</h1>
          <p className="text-gray-600">Manage group projects with ease</p>
        </div>

        <div className="space-y-4">
          <p className="text-center text-gray-700">
            Sign in with your Google account to get started
          </p>

          <button
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-900 font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:shadow-md active:scale-95"
          >
            <FcGoogle className="text-2xl" />
            Sign in with Google
          </button>
        </div>

        <div className="pt-6 border-t border-gray-200">
          <p className="text-xs text-center text-gray-500">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
