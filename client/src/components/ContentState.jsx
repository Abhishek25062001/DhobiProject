import React from 'react';
import ApiLoadError from './ApiLoadError';

export default function ContentState({ resource, children }) {
  if (resource.error) return <ApiLoadError message="Page content could not be loaded." onRetry={resource.retry} />;
  if (resource.loading) return <div className="min-h-[60vh]" aria-busy="true" aria-label="Loading page content" />;
  if (!resource.page) return null;
  return children;
}
