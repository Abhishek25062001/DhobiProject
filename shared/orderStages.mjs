// Authoritative booking journey. Alternate stored names are aliases, never extra steps.
export const TRACKING_STAGES = Object.freeze([
  { id: 'ORDER_PLACED', status: 'BOOKED', label: 'Order Placed', icon: 'Package', aliases: ['BOOKED', 'ORDER_PLACED'] },
  { id: 'CONFIRMED', status: 'CONFIRMED', label: 'Confirmed', icon: 'CheckCircle2', aliases: ['CONFIRMED'] },
  { id: 'PICKUP_SCHEDULED', status: 'PICKUP_ASSIGNED', label: 'Pickup Scheduled', icon: 'Calendar', aliases: ['PICKUP_SCHEDULED', 'PICKUP_ASSIGNED'] },
  { id: 'OUT_FOR_PICKUP', status: 'OUT_FOR_PICKUP', label: 'Out for Pickup', icon: 'Truck', aliases: ['OUT_FOR_PICKUP'] },
  { id: 'PICKED_UP', status: 'PICKED_UP', label: 'Picked Up', icon: 'PackageCheck', aliases: ['PICKED_UP'] },
  { id: 'IN_WASH', status: 'IN_WASHING', label: 'In Wash', icon: 'WashingMachine', aliases: ['IN_WASH', 'IN_WASHING'] },
  { id: 'IN_IRONING', status: 'IN_IRONING', label: 'Steam Press', icon: 'Sparkles', aliases: ['IN_IRONING'] },
  { id: 'READY', status: 'QUALITY_CHECK', label: 'Ready & QC', icon: 'ShieldCheck', aliases: ['READY', 'QUALITY_CHECK'] },
  { id: 'OUT_FOR_DELIVERY', status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: 'Truck', aliases: ['OUT_FOR_DELIVERY'] },
  { id: 'DELIVERED', status: 'DELIVERED', label: 'Delivered', icon: 'CheckCircle2', aliases: ['DELIVERED'] },
].map(stage => Object.freeze({ ...stage, aliases: Object.freeze(stage.aliases) })));

export const ORDER_STATUS_VALUES = Object.freeze([...TRACKING_STAGES.flatMap(stage => stage.aliases), 'CANCELLED']);
export const ORDER_STATUS_OPTIONS = Object.freeze([...TRACKING_STAGES.map(stage => stage.status), 'CANCELLED']);
export const orderStage = status => TRACKING_STAGES.find(stage => stage.aliases.includes(String(status || '').toUpperCase())) || null;
export const orderStatusLabel = status => orderStage(status)?.label || (status === 'CANCELLED' ? 'Cancelled' : 'Status unavailable');
export const preferredOrderStatus = status => orderStage(status)?.status || status;
export const isActiveOrder = order => !['DELIVERED', 'CANCELLED'].includes(order.orderStatus);
