import React from 'react';
import ManagedImage from './ManagedImage';
import { visibleContentItems } from '../../../shared/contentSchema.mjs';

export default function ContentBlocks({ content, text }) {
  if (!content) return null;
  return <section className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm space-y-8 text-slate-700 text-sm leading-relaxed">
    {content.eyebrow && <p className="text-xs font-bold uppercase text-primary-700">{text(content.eyebrow)}</p>}
    {(content.plain || content.accent) && <h2 className="text-xl font-bold">{text(content.plain)} <span className="text-primary-600">{text(content.accent)}</span></h2>}
    {content.intro && <p>{text(content.intro)}</p>}
    {visibleContentItems(content.items).map(item => <section key={item.id} className="space-y-3"><h3 className="font-bold">{text(item.title)}</h3><ManagedImage optional reference={item.image} className="max-w-full h-auto rounded-xl" />{item.paragraphs.map((paragraph, index) => <p key={index} className="whitespace-pre-line">{text(paragraph)}</p>)}</section>)}
  </section>;
}
