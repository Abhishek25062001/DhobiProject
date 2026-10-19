import CopyFields from '../../components/CopyFields';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Trash2, Plus, Undo2 } from 'lucide-react';
import { contentService } from '../../services/api';
import ContentFields, { fieldLabel } from '../../components/ContentFields';
import DeliverySettings from '../../components/DeliverySettings';
import ContentBlocks from '../../components/ContentBlocks';
import { useGlobalContent } from '../../context/SiteContentContext';
import ApiLoadError from '../../components/ApiLoadError';
import useMediaLibrary from '../../hooks/useMediaLibrary';
import useApiResource from '../../hooks/useApiResource';
import { CONTENT_SCHEMAS, CONTENT_BINDINGS, PAGE_KEYS, SEO_SCHEMA, blankContentValue, validatePageContent, isCustomSection, newCustomSection, bindContentText } from '../../../../shared/contentSchema.mjs';

const sectionName = section => isCustomSection(section) ? `Custom: ${section.content.plain || section.content.accent || 'Untitled section'}` : fieldLabel(section.key);
function previewContent(value, assets) {
  if (!value || typeof value !== 'object') return value;
  if (value.assetId) return { ...value, asset: assets.find(asset => asset._id === value.assetId) };
  if (Array.isArray(value)) return value.map(child => previewContent(child, assets));
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, previewContent(child, assets)]));
}
export default function AdminContentTab() {
  const [pageKey, setPageKey] = useState('home');
  const [page, setPage] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [newSection, setNewSection] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [removed, setRemoved] = useState([]);
  const [notice, setNotice] = useState('');
  const dialog = useRef(null);
  const sectionNodes = useRef(new Map());
  const focusSection = useRef(null);
  const media = useMediaLibrary();
  const { config, bindings } = useGlobalContent();
  const loadTemplates = useCallback(signal => contentService.sectionTemplates(pageKey, { signal }), [pageKey]);
  const templates = useApiResource(loadTemplates);
  const available = (templates.data?.sections || []).filter(candidate => !page?.sections.some(section => section.key === candidate.key));
  const selectedTemplate = available.find(section => section.key === newSection);
  const undoableRemoved = removed.findLast(item => !page?.sections.some(section => section.key === item.section.key));
  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const response = await contentService.getAdmin(pageKey);
      setPage(response.page || { pageKey, schemaVersion: 1, revision: 0, seo: blankContentValue(SEO_SCHEMA), sections: [] });
      setDirty(false); setWarnings([]); setRemoved([]); setNotice(''); setNewSection('');
    } catch (err) { setError(err.response?.data?.message || 'The content editor could not be loaded.'); }
    finally { setBusy(false); }
  }, [pageKey]);
  useEffect(() => { setPage(null); setNewSection(''); setDeleting(null); load(); }, [load]);
  useEffect(() => { if (deleting) dialog.current?.showModal(); }, [deleting]);
  useEffect(() => {
    const node = sectionNodes.current.get(focusSection.current);
    if (node) { node.open = true; node.scrollIntoView({ block: 'start' }); node.querySelector('summary')?.focus(); focusSection.current = null; }
  }, [page]);
  function edit(next) { setPage(next); setDirty(true); setError(''); }
  function addSection() {
    if ((!selectedTemplate && newSection !== 'custom') || busy || page.sections.length >= 60) return;
    const section = newSection === 'custom' ? newCustomSection(`custom_${crypto.randomUUID()}`) : structuredClone(selectedTemplate);
    section.isVisible = true;
    section.sortOrder = Math.max(-1, ...page.sections.map(item => item.sortOrder)) + 1;
    focusSection.current = section.key;
    edit({ ...page, sections: [...page.sections, section] });
    setNewSection(''); setNotice(`${sectionName(section)} added to the draft. Edit it below, then save and publish.`);
  }
  function removeSection() {
    if (!deleting || busy) return;
    const index = page.sections.findIndex(section => section.key === deleting.key);
    if (index < 0) { setDeleting(null); return; }
    setRemoved(previous => [...previous.filter(item => item.section.key !== deleting.key), { section: page.sections[index], index }]);
    edit({ ...page, sections: page.sections.filter(section => section.key !== deleting.key) });
    setNotice(`${sectionName(deleting)} deleted from the draft. Save and publish to update the website.`);
    setDeleting(null);
  }
  function undoDelete() {
    if (!undoableRemoved) return;
    const sections = [...page.sections]; sections.splice(undoableRemoved.index, 0, undoableRemoved.section);
    focusSection.current = undoableRemoved.section.key;
    edit({ ...page, sections }); setRemoved(previous => previous.filter(item => item !== undoableRemoved)); setNotice('Section restored with its previous content.');
  }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      validatePageContent(page);
      const response = await contentService.save(pageKey, page);
      setPage(response.page); setDirty(false); setRemoved([]); setNotice('Changes published.'); setWarnings(response.warnings || []);
      toast.success('Website content published.');
    } catch (err) { setError(err.response?.data?.message || err.message); }
    finally { setBusy(false); }
  }
  return <section className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 space-y-5">
    <h2 className="text-xl font-bold">Website content</h2>
    <p className="text-sm text-slate-600">Add, edit, hide or delete sections, then save and publish to update the website. Upload images in any image field or browse the thumbnail library.</p>
    <div className="flex flex-wrap items-center gap-3"><label>Page<select className="border rounded-lg p-2 ml-2" disabled={dirty || busy} value={pageKey} onChange={event => setPageKey(event.target.value)}>{PAGE_KEYS.map(key => <option key={key} value={key}>{fieldLabel(key)}</option>)}</select></label><button type="button" className="text-indigo-700 font-bold disabled:opacity-50" disabled={busy} onClick={load}>{dirty ? 'Discard changes and reload' : 'Reload'}</button>{page && <span className="text-sm text-slate-500">Revision {page.revision}{dirty ? ' · Unsaved changes' : ''}</span>}</div>
    {error && <ApiLoadError message={error} onRetry={load} />}
    {warnings.map(warning => <p key={warning} role="status" className="text-amber-800 bg-amber-50 rounded-lg p-3 text-sm">{warning}</p>)}
    {pageKey === 'home' && <DeliverySettings />}
    {notice && <div role="status" className="rounded-xl bg-indigo-50 p-3 text-sm text-indigo-900 flex flex-wrap items-center gap-3"><span>{notice}</span>{undoableRemoved && <button type="button" disabled={busy} onClick={undoDelete} className="inline-flex items-center gap-1 font-bold underline"><Undo2 size={16} aria-hidden="true" />Undo delete</button>}</div>}
    {page && <form onSubmit={save}>
      <fieldset disabled={busy} className="space-y-5 min-w-0">
        <details className="border rounded-xl p-4"><summary className="font-bold cursor-pointer">Search and sharing metadata</summary><div className="pt-3"><ContentFields schema={SEO_SCHEMA} value={page.seo} onChange={seo => edit({ ...page, seo })} /></div></details>
        {!page.sections.length && <p className="border border-dashed rounded-xl p-4 text-sm text-slate-500">This page has no sections. Choose a section below to get started.</p>}
        {page.sections.map((section, index) => <div key={section.key} className="relative border rounded-xl">
          <details ref={node => { if (node) sectionNodes.current.set(section.key, node); else sectionNodes.current.delete(section.key); }} className="p-4 scroll-mt-24" open={page.sections.length === 1}>
            <summary tabIndex={0} className="font-bold cursor-pointer pr-24 break-words">{sectionName(section)}{!section.isVisible && ' · Hidden'}</summary>
            <div className="pt-4 space-y-4"><div className="flex flex-wrap gap-5 items-center"><label className="flex gap-2 text-sm"><input type="checkbox" checked={section.isVisible} onChange={event => edit({ ...page, sections: page.sections.map((old, i) => i === index ? { ...old, isVisible: event.target.checked } : old) })} />Visible</label><label className="text-sm">Section order<input type="number" required step="1" className="border rounded-lg p-2 w-20 ml-2" value={section.sortOrder} onChange={event => edit({ ...page, sections: page.sections.map((old, i) => i === index ? { ...old, sortOrder: Number(event.target.value) } : old) })} /></label></div>
              {section.type === 'copy' ? <CopyFields content={section.content} onChange={content => edit({ ...page, sections: page.sections.map((old, i) => i === index ? { ...old, content } : old) })} /> : <ContentFields schema={CONTENT_SCHEMAS[section.type]} value={section.content} onChange={content => edit({ ...page, sections: page.sections.map((old, i) => i === index ? { ...old, content } : old) })} />}
              {isCustomSection(section) && <details className="border rounded-xl bg-slate-50 p-3"><summary className="cursor-pointer font-semibold text-sm">Preview section</summary><div className="mt-3"><ContentBlocks content={previewContent(section.content, media.data?.data || [])} text={value => bindContentText(value, config, { ...bindings, ...(pageKey === 'home' ? { 'home.turnaroundHours': page.sections.find(item => item.key === 'hero')?.content.turnaroundHours } : {}) })} /></div></details>}
            </div>
          </details>
          <button type="button" aria-label={`Delete ${sectionName(section)} section`} onClick={() => setDeleting(section)} className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500"><Trash2 size={16} aria-hidden="true" />Delete</button>
        </div>)}
        <div className="border border-dashed border-indigo-200 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold">Add a section</h3>
          {templates.error ? <p role="alert" className="text-sm text-red-700">Preset sections could not be loaded. <button type="button" className="underline" onClick={templates.retry}>Retry section choices</button></p> : templates.loading && <p role="status" className="text-sm text-slate-500">Loading preset sections…</p>}
          <div className="flex flex-wrap gap-3"><label className="grow min-w-0"><span className="sr-only">Section to add</span><select className="w-full border rounded-lg p-2 bg-white disabled:bg-slate-100 disabled:text-slate-500" disabled={page.sections.length >= 60} value={selectedTemplate || newSection === 'custom' ? newSection : ''} onChange={event => setNewSection(event.target.value)}><option value="">Choose a section to add</option><option value="custom">Custom text and images</option>{available.map(section => <option key={section.key} value={section.key}>{sectionName(section)} (preset)</option>)}</select></label><button type="button" disabled={(!selectedTemplate && newSection !== 'custom') || page.sections.length >= 60} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 text-white px-4 py-2 font-bold disabled:opacity-40 disabled:cursor-not-allowed" onClick={addSection}><Plus size={18} aria-hidden="true" />Add section</button></div>
          <p className="text-xs text-slate-500">{page.sections.length >= 60 ? 'This page has reached the limit of 60 sections. Delete a section before adding another.' : 'Add multiple custom sections with text and images. Deleted presets can be added again with their default content.'}</p>
          <p className="text-xs text-slate-500">{pageKey === 'home' ? 'Use Section order to place a custom section between existing homepage sections.' : pageKey === 'global' ? 'Global custom sections appear above the footer across the website.' : 'Custom sections appear below this page’s main content, in Section order.'}</p>
        </div>
        <details className="text-xs text-slate-500"><summary>Live configuration values in text</summary><p>Use a binding to display its current saved value: {CONTENT_BINDINGS.map(key => `{{config.${key}}}`).join(', ')}. Product prices and service availability are managed in Products and Platform settings.</p></details>
        {media.error && <p className="text-red-700">The media library is unavailable. Existing image references are preserved.</p>}
        <button type="submit" disabled={busy || !dirty} className="bg-indigo-600 text-white font-bold rounded-xl px-5 py-3 disabled:opacity-50">{busy ? 'Saving…' : 'Save and publish'}</button>
      </fieldset>
    </form>}
    {deleting && <dialog ref={dialog} aria-labelledby="delete-section-title" onCancel={() => setDeleting(null)} className="rounded-2xl p-6 max-w-md w-[calc(100%-2rem)] space-y-4 text-slate-900 shadow-xl backdrop:bg-slate-900/50">
      <h3 id="delete-section-title" className="text-lg font-bold">Delete {sectionName(deleting)} section?</h3>
      <p className="text-sm text-slate-600">This removes the section and its content from your draft. The website changes when you save and publish. Uploaded images stay in the media library.</p>
      {deleting.type === 'copy' && <p className="text-sm text-slate-600">This section contains the page’s labels and messages. Deleting it will also remove that text.</p>}
      <p className="text-sm text-slate-600">You can undo this deletion before publishing. Re-adding a preset later starts with default content.</p>
      <div className="flex flex-wrap gap-3"><button type="button" autoFocus onClick={() => setDeleting(null)} className="border rounded-lg px-4 py-2">Cancel</button><button type="button" onClick={removeSection} className="bg-red-600 text-white rounded-lg px-4 py-2 font-bold">Delete section</button></div>
    </dialog>}
  </section>;
}
