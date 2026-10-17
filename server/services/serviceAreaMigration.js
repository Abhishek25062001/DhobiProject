import Migration from '../models/Migration.js';
import ServiceArea from '../models/ServiceArea.js';
import defaults from '../content/serviceAreaDefaults.json' with { type: 'json' };

export async function serviceAreaMigration({ apply = false } = {}) {
  const areas = await ServiceArea.find().lean();
  const completed = await Migration.exists({ _id: 'service-areas-v1' });
  const pending = completed ? [] : defaults.filter(area => !areas.some(saved => saved.slug === area.slug));
  for (const area of pending) {
    await new ServiceArea(area).validate();
    if (areas.some(saved => saved.isActive && saved.pincodes.some(pin => area.pincodes.includes(pin)))) throw new Error(`Existing coverage overlaps with migration hub ${area.slug}; review before applying.`);
  }
  if (apply && !completed) {
    await ServiceArea.init();
    for (const area of pending) await ServiceArea.updateOne({ slug: area.slug }, { $setOnInsert: area }, { upsert: true, runValidators: true });
  }
    if (apply && !completed) await Migration.updateOne({ _id: 'service-areas-v1' }, { $setOnInsert: { appliedAt: new Date() } }, { upsert: true });
  return { areas, changed: pending.length };
}
