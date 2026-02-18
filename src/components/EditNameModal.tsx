'use client';

import { useState } from 'react';

interface EditNameModalProps {
  currentName: string;
  onClose: () => void;
  onSave: (newName: string) => void;
}

export function EditNameModal({ currentName, onClose, onSave }: EditNameModalProps) {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name || name.trim().length === 0) {
      setError('Name cannot be empty');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to update name');
        setSaving(false);
        return;
      }

      onSave(name.trim());
      onClose();
      window.location.reload();
    } catch (e) {
      setError('An error occurred');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-[#111318] mb-4">Edit Your Name</h2>
        
        <div className="mb-4">
          <label htmlFor="edit-name" className="block text-sm font-semibold text-[#111318] mb-2">
            Your Name
          </label>
          <input
            id="edit-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder="Enter your full name"
            className={`w-full px-4 py-2 rounded-lg border ${
              error ? 'border-red-500' : 'border-[#dbdfe6]'
            } focus:outline-none focus:ring-2 focus:ring-primary/40 transition`}
          />
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-[#dbdfe6] text-[#616f89] hover:bg-[#f3f4f6] transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
