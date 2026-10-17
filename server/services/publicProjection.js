const pick = (record, keys) => {
  const raw = record?.toObject ? record.toObject() : record;
  return raw ? Object.fromEntries(keys.filter(key => raw[key] !== undefined).map(key => [key, raw[key]])) : null;
};
export const publicCategory = record => pick(record, ['_id', 'name', 'slug', 'shortName', 'description', 'icon', 'sortOrder', 'isActive', 'updatedAt']);
export const publicGarment = record => pick(record, ['_id', 'name', 'category', 'categoryId', 'shortName', 'description', 'sortOrder', 'allowedServices', 'allowedIroningTiers', 'iconName', 'pricing', 'isActive', 'isCustom', 'updatedAt']);
export const publicSlot = record => pick(record, ['_id', 'label', 'startHour', 'endHour', 'maxCapacity', 'sortOrder', 'isActive', 'updatedAt']);
export const publicCoupon = record => pick(record, ['_id', 'code', 'description', 'discountType', 'discountValue', 'minOrderSubtotal', 'maxDiscountAmount', 'isActive', 'expiresAt', 'updatedAt']);
export const publicArea = record => pick(record, ['_id', 'slug', 'name', 'shortName', 'summary', 'footerLabel', 'badge', 'homeBadge', 'pincodeRange', 'turnaround', 'hours', 'timezone', 'coverage', 'pincodes', 'sortOrder', 'isActive', 'revision', 'updatedAt']);
export function publicConfig(record) {
  const config = pick(record, ['_id', 'businessName', 'gstin', 'sacCode', 'supportPhone', 'supportEmail', 'privacyEmail', 'legalEmail', 'supportHours', 'businessAddress', 'freeDeliveryThreshold', 'deliveryFee', 'expressSurcharge', 'gstPercentage', 'minStandardTurnaroundHours', 'expressTurnaroundHours', 'updatedAt']);
  const fields = ['code', 'name', 'shortName', 'description', 'sortOrder', 'isActive', 'extraPricePerOrder', 'priceKey'];
  for (const key of ['serviceTypes', 'ironingTiers', 'detergentOptions', 'packagingOptions']) config[key] = (record[key] || []).map(option => pick(option, fields));
  config.homeCareOptions = (record.homeCareOptions || []).map(option => pick(option, ['id', 'icon', 'label', 'shortLabel', 'description', 'service', 'ironing', 'sortOrder', 'isActive']));
  config.companyPaymentConfig = pick(record.companyPaymentConfig, ['merchantUpiId', 'merchantName', 'officialQrImageUrl', 'allowCashOnDelivery', 'allowCompanyQrOnDelivery']);
  return config;
}
