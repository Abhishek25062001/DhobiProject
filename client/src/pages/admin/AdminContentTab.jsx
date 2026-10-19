import CopyFields from '../../components/CopyFields';
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { contentService } from '../../services/api';
import ContentFields, { fieldLabel } from '../../components/ContentFields';
import DeliverySettings from '../../components/DeliverySettings';
import ApiLoadError from '../../components/ApiLoadError';
import useMediaLibrary from '../../hooks/useMediaLibrary';
import { CONTENT_SCHEMAS, CONTENT_BINDINGS, PAGE_KEYS, PAGE_SECTIONS, SEO_SCHEMA, blankContentValue, validatePageContent } from '../../../../shared/contentSchema.mjs';

export default function AdminContentTab() {
  const [pageKey, setPageKey] = useState('home');
  const [page, setPage] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [newSection, setNewSection] = useState('');
  const media = useMediaLibrary();
  const load = useCallback(async () => {
    setBusy(true); setError('');
    try { const response = await contentService.getAdmin(pageKey); setPage(response.page || { pageKey, schemaVersion: 1, revision: 0, seo: blankContentValue(SEO_SCHEMA), sections: [] }); setDirty(false); setWarnings([]); }
    catch (err) { setError(err.response?.data?.message || 'The content editor could not be loaded.'); }
    finally { setBusy(false); }
  }, [pageKey]);
  useEffect(() => { setPage(null); setNewSection(''); load(); }, [load]);
  function edit(next) { setPage(next); setDirty(true); }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { validatePageContent(page); const response = await contentService.save(pageKey, page); setPage(response.page); setDirty(false); setWarnings(response.warnings || []); toast.success('Website content published.'); }
    catch (err) { setError(err.response?.data?.message || err.message); }
    finally { setBusy(false); }
  }
  return <section className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5">
    <h2 className="text-xl font-bold">Website content</h2>
    <p className="text-sm text-slate-600">Save publishes the selected page. Upload images directly in any image field, or browse the library with thumbnail previews. Manage replacements in Products → Media library.</p>
    <div className="flex flex-wrap items-center gap-3"><label>Page<select className="border rounded-lg p-2 ml-2" disabled={dirty || busy} value={pageKey} onChange={event => setPageKey(event.target.value)}>{PAGE_KEYS.map(key => <option key={key} value={key}>{fieldLabel(key)}</option>)}</select></label><button type="button" className="text-indigo-700 font-bold" disabled={busy} onClick={load}>{dirty ? 'Discard changes and reload' : 'Reload'}</button>{page && <span className="text-sm text-slate-500">Revision {page.revision}{dirty ? ' · Unsaved changes' : ''}</span>}</div>
    {error && <ApiLoadError message={error} onRetry={load} />}
    {warnings.map(warning => <p key={warning} role="status" className="text-amber-800 bg-amber-50 rounded-lg p-3 text-sm">{warning}</p>)}
    {pageKey === 'home' && <DeliverySettings />}
    {page && <form onSubmit={save} className="space-y-5">
      <details className="border rounded-xl p-4"><summary className="font-bold cursor-pointer">Search and sharing metadata</summary><div className="pt-3"><ContentFields schema={SEO_SCHEMA} value={page.seo} onChange={seo => edit({ ...page, seo })} /></div></details>
      {page.sections.map((section, index) => <details key={section.key} className="border rounded-xl p-4" open={page.sections.length === 1}><summary className="font-bold cursor-pointer">{fieldLabel(section.key)}{!section.isVisible && ' · Hidden'}</summary><div className="pt-4 space-y-4"><div className="flex gap-5 items-center"><label className="flex gap-2 text-sm"><input type="checkbox" checked={section.isVisible} onChange={event => edit({ ...page, sections: page.sections.map((old, i) => i === index ? { ...old, isVisible: event.target.checked } : old) })} />Visible</label><label className="text-sm">Section order<input type="number" required step="1" className="border rounded-lg p-2 w-20 ml-2" value={section.sortOrder} onChange={event => edit({ ...page, sections: page.sections.map((old, i) => i === index ? { ...old, sortOrder: Number(event.target.value) } : old) })} /></label></div>{section.type === 'copy' ? <CopyFields content={section.content} onChange={content => edit({ ...page, sections: page.sections.map((old, i) => i === index ? { ...old, content } : old) })} /> : <ContentFields schema={CONTENT_SCHEMAS[section.type]} value={section.content} onChange={content => edit({ ...page, sections: page.sections.map((old, i) => i === index ? { ...old, content } : old) })} />}</div></details>)}
      <div className="flex gap-3"><select aria-label="Section to add" className="border rounded-lg p-2" value={newSection} onChange={event => setNewSection(event.target.value)}><option value="">Choose a section to add</option>{Object.keys(PAGE_SECTIONS[pageKey]).filter(key => !page.sections.some(section => section.key === key)).map(key => <option key={key}>{key}</option>)}</select><button type="button" disabled={!newSection} className="text-indigo-700 font-bold" onClick={() => { const type = PAGE_SECTIONS[pageKey][newSection]; edit({ ...page, sections: [...page.sections, { key: newSection, type, isVisible: true, sortOrder: page.sections.length, content: blankContentValue(CONTENT_SCHEMAS[type]) }] }); setNewSection(''); }}>Add section</button></div>
      <details className="text-xs text-slate-500"><summary>Live configuration values in text</summary><p>Use a binding to display its current saved value: {CONTENT_BINDINGS.map(key => `{{config.${key}}}`).join(', ')}. Product prices and service availability are managed in Products and Platform settings.</p></details>
      {media.error && <p className="text-red-700">The media library is unavailable. Existing image references are preserved.</p>}
      <button type="submit" disabled={busy || !dirty} className="bg-indigo-600 text-white font-bold rounded-xl px-5 py-3 disabled:opacity-50">{busy ? 'Saving…' : 'Save and publish'}</button>
    </form>}
  </section>;
}
