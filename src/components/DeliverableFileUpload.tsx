'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, X, File, Download, Eye } from 'lucide-react';

interface FileItem {
  id: string;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  uploadedAt: string;
  uploadedBy?: {
    name: string;
    email: string;
  };
}

interface DeliverableFileUploadProps {
  deliverableId: string;
  onFilesUploaded?: (files: FileItem[]) => void;
  readOnly?: boolean;
}

export default function DeliverableFileUpload({
  deliverableId,
  onFilesUploaded,
  readOnly = false,
}: DeliverableFileUploadProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing files
  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/deliverables/${deliverableId}/files`
      );
      if (!response.ok) {
        // It's OK if no files exist yet
        setFiles([]);
        return;
      }
      const data = await response.json();
      setFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching files:', err);
      // Don't show error if no files exist yet
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [deliverableId]);

  // Initial load
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Prevent default drag behavior on document
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleUpload = async (filesToUpload: File[]) => {
    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      filesToUpload.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch(
        `/api/deliverables/${deliverableId}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();
      
      // Refresh file list
      await fetchFiles();
      onFilesUploaded?.(data.files);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (!readOnly && e.dataTransfer?.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      if (newFiles.length > 0) {
        handleUpload(newFiles);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const newFiles = Array.from(e.target.files);
      handleUpload(newFiles);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const response = await fetch(
        `/api/deliverables/${deliverableId}/files`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId }),
        }
      );

      if (!response.ok) throw new Error('Failed to delete file');

      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete file');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <div className="text-gray-500">Loading files...</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!readOnly && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition pointer-events-auto ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${uploading ? 'opacity-50' : ''}`}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">
            {uploading ? 'Uploading...' : 'Drag and drop files here, or click to select'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Max 50MB per file
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">
            Uploaded Files ({files.length})
          </h3>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.fileName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.fileSize)} •{' '}
                      {formatDate(file.uploadedAt)}
                      {file.uploadedBy && ` • by ${file.uploadedBy.name}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => {
                      if (file.fileUrl) {
                        window.open(file.fileUrl, '_blank');
                      }
                    }}
                    disabled={!file.fileUrl}
                    className={`p-1 rounded transition ${file.fileUrl ? 'hover:bg-blue-100 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                    title={file.fileUrl ? "Preview file" : "Preview not available"}
                  >
                    <Eye className={`w-4 h-4 ${file.fileUrl ? 'text-blue-600' : 'text-gray-400'}`} />
                  </button>
                  <a
                    href={file.fileUrl || '#'}
                    download
                    className={`p-1 rounded transition ${file.fileUrl ? 'hover:bg-gray-200 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                    title={file.fileUrl ? "Download file" : "Download not available"}
                    onClick={(e) => !file.fileUrl && e.preventDefault()}
                  >
                    <Download className={`w-4 h-4 ${file.fileUrl ? 'text-gray-600' : 'text-gray-400'}`} />
                  </a>
                  {!readOnly && (
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="p-1 hover:bg-red-100 rounded transition"
                      title="Delete file"
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
