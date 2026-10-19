export const TRACKING_STAGES = Object.freeze([
  { id: 'ORDER_PLACED', label: 'Order placed', icon: 'Package', aliases: ['BOOKED', 'ORDER_PLACED'] },
  { id: 'CONFIRMED', label: 'Confirmed', icon: 'CheckCircle2', aliases: ['CONFIRMED'] },
  { id: 'PICKUP_SCHEDULED', label: 'Pickup scheduled', icon: 'Calendar', aliases: ['PICKUP_SCHEDULED', 'PICKUP_ASSIGNED'] },
  { id: 'OUT_FOR_PICKUP', label: 'Out for pickup', icon: 'Truck', aliases: ['OUT_FOR_PICKUP'] },
  { id: 'PICKED_UP', label: 'Picked up', icon: 'PackageCheck', aliases: ['PICKED_UP'] },
  { id: 'IN_WASH', label: 'In wash', icon: 'WashingMachine', aliases: ['IN_WASH', 'IN_WASHING'] },
  { id: 'IN_IRONING', label: 'Steam press', icon: 'Sparkles', aliases: ['IN_IRONING'] },
  { id: 'READY', label: 'Ready & quality checked', icon: 'ShieldCheck', aliases: ['READY', 'QUALITY_CHECK'] },
  { id: 'OUT_FOR_DELIVERY', label: 'Out for delivery', icon: 'Truck', aliases: ['OUT_FOR_DELIVERY'] },
  { id: 'DELIVERED', label: 'Delivered', icon: 'CheckCircle2', aliases: ['DELIVERED'] },
]);

export function getTrackingState(order) {
  const status = String(order?.orderStatus || '').toUpperCase();
  const index = TRACKING_STAGES.findIndex(stage => stage.aliases.includes(status));
  const pickup = index >= 0 && index < 4;
  const delivery = index >= 7 && index < 9;
  const logistics = order?.logistics || {};
  return {
    index, stage: TRACKING_STAGES[index] || null,
    step: index + 1,
    pickup,
    rider: pickup ? logistics.pickupRider || logistics.assignedRider
      : logistics.deliveryRider || (delivery ? logistics.assignedRider : null),
    otpType: pickup && !logistics.pickedUpAt ? 'pickup' : delivery && !logistics.deliveredAt ? 'delivery' : null,
    totalItems: (order?.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
  };
}

// Status updates change the API's sorting. Keep the selected booking by ID.
export const selectTrackedOrder = (orders, selectedId) => orders.find(order => order._id === selectedId) || orders[0] || null;
