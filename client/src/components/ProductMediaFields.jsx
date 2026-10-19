import React from 'react';
import MediaPicker from './MediaPicker';
export default function ProductMediaFields({ value, onChange }) {
  const gallery = value.gallery || [];
  return <div className="space-y-3">
    <MediaPicker label="Product image" maxAltLength={300} value={value.primaryImage || null} onChange={(primaryImage, asset) => onChange({ ...value, primaryImage, imageUrl: asset?.url || '', cloudinaryPublicId: asset?.publicId || '' })} />
    <fieldset className="space-y-3"><legend className="font-bold text-slate-700">Gallery images ({gallery.length}/10)</legend>
      {gallery.map((reference, index) => <MediaPicker key={`${index}-${reference?.assetId || 'new'}`} label={`Gallery image ${index + 1}`} maxAltLength={300} value={reference} onChange={next => onChange({ ...value, gallery: next ? gallery.map((old, i) => i === index ? next : old) : gallery.filter((_, i) => i !== index) })} />)}
      {gallery.length < 10 && <MediaPicker label="Add gallery image" value={null} maxAltLength={300} onChange={next => { if (next) onChange({ ...value, gallery: [...gallery, next] }); }} />}
    </fieldset>
    <p className="text-xs text-slate-500">Save the product to publish image selections. Replacing a library image updates every placement using it.</p>
  </div>;
}
