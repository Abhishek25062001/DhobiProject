export const activeOptions = options => (options || []).filter(option => option.isActive !== false).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
export const customTemplate = garments => garments.find(garment => garment.isCustom && garment.isActive !== false) || null;
export function validPreferences(preferences, config) {
  return [['detergentType', 'detergentOptions'], ['packagingType', 'packagingOptions']].every(([key, list]) => activeOptions(config?.[list]).some(option => option.code === preferences?.[key]));
}
export function scheduleAllowed(pickup, delivery, slots, config, express) {
  const first = activeOptions(slots).find(slot => slot.label === pickup?.timeSlot);
  const last = activeOptions(slots).find(slot => slot.label === delivery?.timeSlot);
  if (!first || !last || !pickup?.date || !delivery?.date) return false;
  const dateAt = (date, hour) => new Date(`${date}T${String(hour).padStart(2, '0')}:00:00+05:30`).getTime();
  const interval = dateAt(delivery.date, last.startHour) - dateAt(pickup.date, first.endHour);
  const required = express ? config.expressTurnaroundHours : config.minStandardTurnaroundHours;
  return Number.isFinite(interval) && interval > 0 && interval >= required * 3600000;
}
