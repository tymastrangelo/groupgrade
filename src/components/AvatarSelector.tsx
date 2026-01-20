"use client";

import { useState } from 'react';
import { getRandomAvatarUrl } from '@/lib/avatars';

export function AvatarSelector({ 
  currentAvatar, 
  onClose 
}: { 
  currentAvatar?: string | null; 
  onClose: () => void;
}) {
  const [avatar, setAvatar] = useState(() => currentAvatar || getRandomAvatarUrl());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const randomize = () => {
    setAvatar(getRandomAvatarUrl());
  };

  const saveAvatar = async () => {
    setSaving(true);
    setError(null);
    
    try {
      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: avatar }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save avatar');
      }

      // Refresh the page to update avatar everywhere
      window.location.reload();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save avatar';
      setError(errorMessage);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md bg-white dark:bg-[#111827] rounded-xl shadow-2xl border border-[#e5e7eb] dark:border-[#2d3748] p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-lg font-bold text-[#111318] dark:text-white">Choose Your Avatar</h4>
            <p className="text-sm text-[#616f89]">Click randomize to shuffle through avatars.</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-[#616f89] hover:text-[#111318] dark:hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative">
            <img 
              src={avatar} 
              alt="Your avatar" 
              className="w-32 h-32 rounded-full border-4 border-primary/20 shadow-lg"
            />
          </div>

          <button
            onClick={randomize}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#f3f4f6] dark:bg-[#2d3748] text-[#111318] dark:text-white font-bold text-sm hover:bg-[#e5e7eb] dark:hover:bg-[#374151] transition-colors"
          >
            <span className="material-symbols-outlined text-base">shuffle</span>
            Randomize
          </button>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e5e7eb] dark:border-[#2d3748]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-bold text-[#616f89] hover:text-[#111318] dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={saveAvatar}
            disabled={saving}
            className="px-6 py-2 rounded-lg text-sm font-bold bg-primary text-white disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Avatar'}
          </button>
        </div>
      </div>
    </div>
  );
}
