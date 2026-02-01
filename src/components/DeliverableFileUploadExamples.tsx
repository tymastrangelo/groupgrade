'use client';

import { useState } from 'react';
import DeliverableFileUpload from '@/components/DeliverableFileUpload';

/**
 * EXAMPLE 1: Simple Integration
 * Minimal setup - just add the component with required prop
 */
export function SimpleExample({ deliverableId }: { deliverableId: string }) {
  return (
    <div className="p-4">
      <h2>Upload Submission</h2>
      <DeliverableFileUpload deliverableId={deliverableId} />
    </div>
  );
}

/**
 * EXAMPLE 2: With Callbacks
 * Show feedback when files are uploaded
 */
export function CallbackExample({ deliverableId }: { deliverableId: string }) {
  const [uploadedCount, setUploadedCount] = useState(0);

  return (
    <div className="p-4">
      <h2>Upload Submission</h2>
      {uploadedCount > 0 && (
        <div className="mb-4 p-3 bg-green-100 rounded text-green-800">
          {uploadedCount} file(s) uploaded successfully!
        </div>
      )}
      <DeliverableFileUpload
        deliverableId={deliverableId}
        onFilesUploaded={(files) => {
          setUploadedCount(files.length);
          // Could also save to parent state, trigger notifications, etc.
        }}
      />
    </div>
  );
}

/**
 * EXAMPLE 3: Read-Only View
 * Show files but don't allow uploads (e.g., for viewing submissions)
 */
export function ViewOnlyExample({ deliverableId }: { deliverableId: string }) {
  return (
    <div className="p-4">
      <h2>Submitted Files</h2>
      <DeliverableFileUpload 
        deliverableId={deliverableId} 
        readOnly={true}
      />
    </div>
  );
}

/**
 * EXAMPLE 4: Conditional Upload
 * Allow upload only if user has permission
 */
interface ConditionalExampleProps {
  deliverableId: string;
  canUpload: boolean;
  userRole: 'student' | 'teacher';
}

export function ConditionalExample({
  deliverableId,
  canUpload,
  userRole,
}: ConditionalExampleProps) {
  return (
    <div className="p-4">
      <h2>Submit Work</h2>
      {!canUpload && userRole === 'teacher' && (
        <div className="mb-4 p-3 bg-blue-100 rounded text-blue-800">
          Teachers can view submissions but cannot upload files.
        </div>
      )}
      <DeliverableFileUpload
        deliverableId={deliverableId}
        readOnly={!canUpload}
        onFilesUploaded={(files) => {
          console.log(`[${userRole}] Uploaded ${files.length} files`);
        }}
      />
    </div>
  );
}

/**
 * EXAMPLE 5: In a Form
 * Part of a larger submission form
 */
interface SubmissionFormData {
  notes: string;
  files?: File[];
}

export function FormExample({ deliverableId }: { deliverableId: string }) {
  const [formData, setFormData] = useState<SubmissionFormData>({
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      // Save notes
      const response = await fetch(
        `/api/deliverables/${deliverableId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submissionNotes: formData.notes,
          }),
        }
      );

      if (response.ok) {
        alert('Submission saved!');
        setFormData({ notes: '' });
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to save submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">
          Submission Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) =>
            setFormData({ ...formData, notes: e.target.value })
          }
          placeholder="Add any notes about your submission..."
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Upload Files
        </label>
        <DeliverableFileUpload
          deliverableId={deliverableId}
          onFilesUploaded={(files) => {
            console.log('Files ready:', files);
          }}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
      </button>
    </form>
  );
}

/**
 * EXAMPLE 6: With Progress Tracking
 * Show upload progress to user
 */
export function ProgressExample({ deliverableId }: { deliverableId: string }) {
  const [uploadProgress, setUploadProgress] = useState<{
    total: number;
    completed: number;
  } | null>(null);

  return (
    <div className="p-4">
      <h2>Upload Files</h2>

      {uploadProgress && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Uploading...</span>
            <span>
              {uploadProgress.completed} of {uploadProgress.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{
                width: `${(uploadProgress.completed / uploadProgress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      <DeliverableFileUpload
        deliverableId={deliverableId}
        onFilesUploaded={(files) => {
          setUploadProgress(null);
          console.log(`Uploaded ${files.length} files`);
        }}
      />
    </div>
  );
}

/**
 * EXAMPLE 7: In a Modal
 * Upload files in a popup dialog
 */
import { useState as useStateModal } from 'react';

interface UploadModalProps {
  isOpen: boolean;
  deliverableId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UploadModal({
  isOpen,
  deliverableId,
  onClose,
  onSuccess,
}: UploadModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Upload Submission</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <DeliverableFileUpload
          deliverableId={deliverableId}
          onFilesUploaded={(files) => {
            onSuccess?.();
            onClose();
          }}
        />
      </div>
    </div>
  );
}

/**
 * EXAMPLE 8: Complete Student Submission Page
 * Full page example showing all features together
 */
interface StudentSubmissionPageProps {
  deliverableId: string;
  deliverableTitle: string;
  dueDate: Date;
}

export function StudentSubmissionPage({
  deliverableId,
  deliverableTitle,
  dueDate,
}: StudentSubmissionPageProps) {
  const [status, setStatus] = useState<'draft' | 'submitted' | 'submitted-late'>(
    'draft'
  );
  const [notes, setNotes] = useState('');

  const isDue = new Date() > dueDate;
  const daysLeft = Math.ceil(
    (dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {deliverableTitle}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>
              Due: {dueDate.toLocaleDateString()} at 11:59 PM
            </span>
            {!isDue && (
              <span className={daysLeft > 0 ? 'text-green-600' : 'text-red-600'}>
                {daysLeft > 0
                  ? `${daysLeft} days remaining`
                  : 'Overdue'}
              </span>
            )}
            {isDue && status !== 'submitted' && (
              <span className="text-red-600 font-semibold">
                ⚠️ Submission is late
              </span>
            )}
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Files Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Your Submission
            </h2>
            <DeliverableFileUpload
              deliverableId={deliverableId}
              onFilesUploaded={(files) => {
                console.log('Files uploaded:', files);
                setStatus('submitted');
              }}
            />
          </div>

          {/* Notes Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Submission Notes (Optional)
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about your submission, such as:
- What you found challenging
- Questions for your instructor
- Anything else you'd like to mention"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={5}
            />
          </div>

          {/* Submit Button */}
          <div className="border-t pt-6">
            <button
              onClick={() => setStatus('submitted')}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
            >
              Mark as Submitted
            </button>
            {status === 'submitted' && (
              <p className="text-sm text-green-600 mt-3">
                ✓ Your submission is complete. You can still add more files
                until the deadline.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Usage in your pages:
 * 
 * import { SimpleExample, FormExample, StudentSubmissionPage } from '@/components/examples';
 * 
 * // Simple usage
 * <SimpleExample deliverableId="uuid-here" />
 * 
 * // Full form
 * <FormExample deliverableId="uuid-here" />
 * 
 * // Complete page
 * <StudentSubmissionPage
 *   deliverableId="uuid-here"
 *   deliverableTitle="Project 1: Web Design"
 *   dueDate={new Date('2024-12-15')}
 * />
 */
