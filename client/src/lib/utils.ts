import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { CheckSquare, Clock, AlertTriangle, FileText, File, Image, CheckCircle, XCircle, User } from "lucide-react"
import React from "react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Consolidated status color utilities
export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    case 'new':
    case 'modified':
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'manager approved':
    case 'committee approved':
    case 'finance approved':
    case 'approved':
    case 'completed':
    case 'approve':
      return 'bg-green-100 text-green-800';
    case 'manager rejected':
    case 'committee rejected':
    case 'finance rejected':
    case 'rejected':
    case 'overdue':
      return 'bg-red-100 text-red-800';
    case 'changes_requested':
      return 'bg-orange-100 text-orange-800';
    case 'processing':
      return 'bg-blue-100 text-blue-800';
    case 'processed':
      return 'bg-blue-100 text-blue-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Dark mode status colors for DocumentAnalysisCard
export const getStatusColorDark = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'processing':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'failed':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
};

// Priority color utility
export const getPriorityColor = (priority: string) => {
  switch (priority.toLowerCase()) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Task icon utility
export const getTaskIcon = (taskType: string) => {
  switch (taskType.toLowerCase()) {
    case 'approval':
      return CheckSquare;
    case 'review':
      return Clock;
    case 'changes_requested':
      return AlertTriangle;
    default:
      return CheckSquare;
  }
};

// File icon utilities
export const getFileIcon = (mimeType: string) => {
  if (mimeType.includes('pdf')) {
    return React.createElement(FileText, { className: "h-5 w-5 text-red-500" });
  }
  return React.createElement(File, { className: "h-5 w-5 text-gray-500" });
};

export const getFileIconForUpload = (file: File) => {
  if (file.type.startsWith('image/')) {
    return React.createElement(Image, { className: "h-5 w-5" });
  } else if (file.type.includes('pdf')) {
    return React.createElement(FileText, { className: "h-5 w-5 text-red-500" });
  } else {
    return React.createElement(File, { className: "h-5 w-5" });
  }
};

// Status icon utility
export const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved':
    case 'approve':
      return React.createElement(CheckCircle, { className: "h-5 w-5 text-green-600" });
    case 'rejected':
      return React.createElement(XCircle, { className: "h-5 w-5 text-red-600" });
    case 'pending':
      return React.createElement(Clock, { className: "h-5 w-5 text-yellow-600" });
    default:
      return React.createElement(User, { className: "h-5 w-5 text-gray-600" });
  }
};

// File size formatter
export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Risk color utility
export const getRiskColor = (risk: string) => {
  switch (risk.toLowerCase()) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Document download utility
export const handleDocumentDownload = async (document: any) => {
  try {
    console.log('Starting download for document:', document);
    const link = window.document.createElement('a');
    link.href = `/api/documents/download/${document.id}`;
    link.download = document.originalName;
    link.target = '_blank';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    console.log('Download initiated successfully');
  } catch (error) {
    console.error('Download failed:', error);
    alert('Download failed. Please try again or contact support.');
  }
};