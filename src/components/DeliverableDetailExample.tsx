'use client';

import { useState, useEffect } from 'react';
import { Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import DeliverableFileUpload from '@/components/DeliverableFileUpload';

interface Deliverable {
  id: string;
  title: string;
  description?: string;
  status: 'not-started' | 'in-progress' | 'submitted' | 'pending';
  dueDate?: string;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  groupId: string;
  projectId: string;
  submittedAt?: string;
  submissionUrl?: string;
  submissionNotes?: string;
}

interface DeliverableDetailProps {
  deliverable: Deliverable;
  isEditable?: boolean;
}

export default function DeliverableDetail({
  deliverable,
  isEditable = false,
}: DeliverableDetailProps) {
  const [notes, setNotes] = useState(deliverable.submissionNotes || '');
  const [isSaving, setIsSaving] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'submitted') return <CheckCircle className="w-4 h-4" />;
    if (status === 'pending') return <AlertCircle className="w-4 h-4" />;
    return null;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleSaveNotes = async () => {
    if (!isEditable) return;
    
    try {
      setIsSaving(true);
      const response = await fetch(
        `/api/deliverables/${deliverable.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissionNotes: notes }),
        }
      );

      if (!response.ok) throw new Error('Failed to save notes');
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Failed to save notes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {deliverable.title}
            </h2>
            {deliverable.description && (
              <p className="text-gray-600 mb-4">{deliverable.description}</p>
            )}
          </div>
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(
              deliverable.status
            )}`}
          >
            {getStatusIcon(deliverable.status)}
            <span className="text-sm font-medium capitalize">
              {deliverable.status.replace('-', ' ')}
            </span>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>Due: {formatDate(deliverable.dueDate)}</span>
          </div>
          {deliverable.assignedTo && (
            <div className="flex items-center gap-2">
              {deliverable.assignedTo.avatar_url && (
                <img
                  src={deliverable.assignedTo.avatar_url}
                  alt={deliverable.assignedTo.name}
                  className="w-4 h-4 rounded-full"
                />
              )}
              <span>Assigned to: {deliverable.assignedTo.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6 border-t pt-6">
        {/* Files Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Submission Files
          </h3>
          <DeliverableFileUpload
            deliverableId={deliverable.id}
            readOnly={!isEditable}
            onFilesUploaded={(files) => {
              console.log('Files uploaded:', files);
              // Optionally refresh deliverable data
            }}
          />
        </div>

        {/* Notes Section */}
        {isEditable && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Submission Notes
            </h3>
            <div className="space-y-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes about your submission..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
              <button
                onClick={handleSaveNotes}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {isSaving ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
        )}

        {/* Display Notes (Read-only) */}
        {!isEditable && deliverable.submissionNotes && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Submission Notes
            </h3>
            <p className="text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
              {deliverable.submissionNotes}
            </p>
          </div>
        )}

        {/* Submission Info */}
        {deliverable.submittedAt && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              <strong>Submitted:</strong>{' '}
              {new Date(deliverable.submittedAt).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
