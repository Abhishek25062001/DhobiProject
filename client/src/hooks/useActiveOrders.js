import { useCustomerOrders } from '../context/CustomerOrdersContext';
import { isActiveOrder } from '../../../shared/orderStages.mjs';

export default function useActiveOrders() {
  const feed = useCustomerOrders();
  return { ...feed, orders: feed.orders.filter(isActiveOrder) };
}
