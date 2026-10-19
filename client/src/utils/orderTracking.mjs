import { TRACKING_STAGES } from '../../../shared/orderStages.mjs';
export { TRACKING_STAGES } from '../../../shared/orderStages.mjs';

export function getTrackingState(order) {
  const status = String(order?.orderStatus || '').toUpperCase();
  const index = TRACKING_STAGES.findIndex(stage => stage.aliases.includes(status));
  const pickup = index >= 0 && index < 4;
  const delivery = index >= 7 && index < 9;
  const logistics = order?.logistics || {};
  return {
    cancelled: status === 'CANCELLED', delivered: status === 'DELIVERED',
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
