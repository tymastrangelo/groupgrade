'use client';

import { signIn } from 'next-auth/react';
import { FcGoogle } from 'react-icons/fc';

export default function SignInPage() {
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
      <style dangerouslySetInnerHTML={{ __html: `
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        body {
          font-family: 'Lexend', sans-serif;
        }
      `}} />
      
      <div className="min-h-screen bg-[#f6f6f8] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Branding Card */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="size-12 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg">
                <span className="material-symbols-outlined text-2xl">account_balance</span>
              </div>
              <div className="flex flex-col text-left">
                <h1 className="text-[#111318] text-2xl font-bold leading-tight">GroupGrade</h1>
                <p className="text-[#616f89] text-sm font-normal">Academic Portal</p>
              </div>
            </div>
          </div>

          {/* Sign In Card */}
          <div className="bg-white rounded-xl shadow-lg border border-[#e5e7eb] p-8 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-[#111318]">Welcome Back</h2>
              <p className="text-[#616f89] text-sm">
                Sign in with your Google account to continue
              </p>
            </div>

            <div className="space-y-4 pt-4">
              <button
                onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                className="w-full flex items-center justify-center gap-3 bg-white border-2 border-[#e5e7eb] hover:border-primary text-[#111318] font-semibold py-3.5 px-4 rounded-lg transition-all duration-200 hover:shadow-md active:scale-[0.98]"
              >
                <FcGoogle className="text-2xl" />
                <span className="text-sm">Continue with Google</span>
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#e5e7eb]"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-[#616f89]">
                    Secure authentication via Google
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#e5e7eb]">
              <p className="text-xs text-center text-[#616f89]">
                By signing in, you agree to our{' '}
                <a href="#" className="text-primary hover:underline font-medium">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-primary hover:underline font-medium">Privacy Policy</a>
              </p>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[#616f89]">
              Need help? <a href="#" className="text-primary hover:underline font-medium">Contact Support</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
