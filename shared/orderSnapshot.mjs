// Historical invoices never consult current catalog or platform configuration.
// Missing legacy identity remains explicitly unrecorded rather than invented.
export function invoiceIdentity(order) {
  const saved = order?.billingSnapshot || {};
  return {
    businessName: saved.businessName ?? 'Business identity not recorded',
    gstin: saved.gstin ?? 'Not recorded', sacCode: saved.sacCode ?? 'Not recorded',
    supportPhone: saved.supportPhone ?? 'Not recorded',
    supportEmail: saved.supportEmail ?? '', businessAddress: saved.businessAddress ?? 'Business address not recorded',
    gstPercentage: saved.gstPercentage ?? order?.pricingBreakdown?.gstPercentage ?? null,
  };
}
export const orderServiceLabel = item => item.serviceLabel || item.serviceType?.replaceAll('_', ' ') || '';
export const orderFinishLabel = item => item.ironingLabel || (item.ironingType === 'NONE' ? 'None' : item.ironingType?.replaceAll('_', ' ')) || '';
