import React from 'react';
import { useLocation } from 'react-router-dom';
import usePageCopy from '../hooks/usePageCopy';
import { useGlobalContent } from '../context/SiteContentContext';
import ContentBlocks from './ContentBlocks';
import { CONTENT_PAGE_PATHS } from '../utils/contentPages';
import { isCustomSection, visibleContentItems } from '../../../shared/contentSchema.mjs';

function Sections({ resource }) {
  const sections = visibleContentItems(resource.sections).filter(isCustomSection);
  if (!sections.length) return null;
  return <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">{sections.map(section =>
    <ContentBlocks key={section.key} content={section.content} text={resource.text} />
  )}</div>;
}

function PageSections({ pageKey }) {
  const content = usePageCopy(pageKey);
  return <Sections resource={content} />;
}

// Homepage sections participate in its main layout. Other page sections follow
// that page's main content; global sections appear above the shared footer.
export default function AdditionalPageSections() {
  const { pathname } = useLocation();
  const { global } = useGlobalContent();
  const pageKey = CONTENT_PAGE_PATHS[pathname.replace(/\/$/, '') || '/'];
  if (!pageKey) return null;
  return <>{pageKey !== 'home' && <PageSections pageKey={pageKey} />}<Sections resource={global} /></>;
}
