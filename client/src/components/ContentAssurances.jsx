import React from 'react';
import ContentIcon from './ContentIcon';
import ManagedImage from './ManagedImage';
import { visibleContentItems } from '../../../shared/contentSchema.mjs';

const tones = ['bg-primary-900/60 text-primary-400', 'bg-teal-900/60 text-teal-400', 'bg-amber-900/60 text-amber-400', 'bg-indigo-900/60 text-indigo-400'];
export default function ContentAssurances({ content, text, footer = false }) {
  if (!content?.items?.length) return null;
  return <div className={footer ? 'grid grid-cols-2 md:grid-cols-4 gap-6 pb-12 border-b border-slate-800 text-center sm:text-left' : 'grid grid-cols-2 md:grid-cols-4 gap-6 py-6 text-center sm:text-left'}>
    {visibleContentItems(content.items).map((item, index) => <div key={item.id} className="flex flex-col sm:flex-row items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${footer ? tones[index % tones.length] : 'bg-primary-100 text-primary-700'}`}>{item.image ? <ManagedImage optional reference={item.image} className="w-10 h-10 object-contain" /> : <ContentIcon name={item.icon} className="w-5 h-5" />}</div>
      <div><h4 className={`${footer ? 'text-white' : 'text-slate-900'} font-bold text-sm`}>{text(item.title)}</h4><p className={`text-xs ${footer ? 'text-slate-400' : 'text-slate-500'}`}>{text(item.description)}</p></div>
    </div>)}
  </div>;
}
