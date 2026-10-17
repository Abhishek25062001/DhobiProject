export const formatRupees = value => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2,
}).format(value).replace(/\.00$/, '');

export function garmentPresentation(garment) {
  return { name: garment?.shortName || garment?.name || '' };
}

export function itemCareLabel(item, config) {
  const service = config?.serviceTypes?.find(option => option.code === item.serviceType);
  const finish = config?.ironingTiers?.find(option => option.code === item.ironingType);
  const care = config?.homeCareOptions?.find(option => option.service === item.serviceType && option.ironing === item.ironingType);
  return care?.shortLabel || [service?.shortName || service?.name, finish?.shortName || finish?.name].filter(Boolean).join(' · ');
}
