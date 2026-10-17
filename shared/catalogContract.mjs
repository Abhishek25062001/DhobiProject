// Stable storage identifiers shared by the API and website. Display names,
// availability, images and price amounts belong to admin-managed records.
// Preserve these identifiers when an administrator renames a service.
export const GARMENT_PRICE_KEYS = Object.freeze([
  'washOnly',
  'standardSteamIron',
  'crispStarchPress',
  'delicatePress',
  'dryClean',
]);

export const SERVICE_CODES = Object.freeze([
  'WASH_AND_FOLD',
  'WASH_AND_IRON',
  'IRON_ONLY',
  'DRY_CLEAN',
]);

// NONE is a stored selection, not an editable ironing-tier record.
export const IRONING_CODES = Object.freeze([
  'NONE',
  'STANDARD_STEAM',
  'CRISP_STARCH',
  'DELICATE_PRESS',
]);
