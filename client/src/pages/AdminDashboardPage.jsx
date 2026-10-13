import React, { useState, useEffect } from 'react';
import { orderService } from '../services/api';
import { 
  Users, 
  Package, 
  Clock, 
  IndianRupee, 
  CheckCircle2, 
  Truck, 
  Sparkles, 
  Search, 
  Filter, 
  RefreshCw, 
  Eye, 
  X, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  'BOOKED',
  'PICKUP_ASSIGNED',
  'PICKED_UP',
  'IN_WASHING',
  'IN_IRONING',
  'QUALITY_CHECK',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED'
];

const AdminDashboardPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected order for detailed modal view
  const [inspectOrder, setInspectOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchAllOrders = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (selectedStatusFilter !== 'ALL') filters.status = selectedStatusFilter;
      if (selectedPaymentFilter !== 'ALL') filters.paymentStatus = selectedPaymentFilter;
      if (searchQuery) filters.search = searchQuery;

      const res = await orderService.getAllOrders(filters);
      if (res.success) {
        setOrders(res.orders);
      }
    } catch (err) {
      console.error('[Admin Orders Error]:', err);
      toast.error('Failed to load orders for admin dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, [selectedStatusFilter, selectedPaymentFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAllOrders();
  };

  // Update order status handler
  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await orderService.updateOrderStatus(orderId, { orderStatus: newStatus });
      if (res.success) {
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, orderStatus: newStatus } : o))
        );
        toast.success(`Order status updated to ${newStatus.replace(/_/g, ' ')}`);
      }
    } catch (err) {
      toast.error('Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Mark COD order as PAID
  const handleMarkAsPaid = async (orderId) => {
    setUpdatingId(orderId);
    try {
      const res = await orderService.updateOrderStatus(orderId, {
        paymentStatus: 'PAID',
        transactionId: `COD_CASH_COLLECTED_${Date.now()}`
      });
      if (res.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o._id === orderId
              ? { ...o, payment: { ...o.payment, status: 'PAID' } }
              : o
          )
        );
        toast.success('Payment status marked as PAID!');
      }
    } catch (err) {
      toast.error('Failed to mark payment as paid.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Metric aggregates
  const totalOrders = orders.length;
  const activePickups = orders.filter((o) => ['BOOKED', 'PICKUP_ASSIGNED'].includes(o.orderStatus)).length;
  const inProcessing = orders.filter((o) => ['IN_WASHING', 'IN_IRONING', 'QUALITY_CHECK'].includes(o.orderStatus)).length;
  const totalRevenue = orders
    .filter((o) => o.payment?.status === 'PAID')
    .reduce((acc, curr) => acc + (curr.pricingBreakdown?.grandTotal || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Dhobi Operations Hub
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-800 text-xs font-bold uppercase">
              Admin &amp; Rider Control
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Dispatch riders, track garment washing &amp; steam ironing queues, and reconcile COD cash collections.
          </p>
        </div>

        <button
          onClick={fetchAllOrders}
          className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Live Queue</span>
        </button>
      </div>

      {/* METRIC OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Total Orders</span>
            <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{totalOrders}</p>
          <span className="text-[10px] text-slate-400">All registered pickups &amp; deliveries</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-amber-600 text-xs font-bold">
            <span>Active Pickups</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{activePickups}</p>
          <span className="text-[10px] text-slate-400">Riders assigned / pending collection</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-indigo-600 text-xs font-bold">
            <span>In Wash / Iron</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{inProcessing}</p>
          <span className="text-[10px] text-slate-400">Processing on boiler press machines</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-teal-600 text-xs font-bold">
            <span>Collected Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-teal-700">₹{totalRevenue.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-slate-400">Online &amp; COD reconciled payments</span>
        </div>

      </div>

      {/* FILTERS & SEARCH BAR */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Order # (e.g. IDB-2026-)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
          />
        </form>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Status filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-semibold hidden md:inline">Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-1 focus:ring-primary-500"
            >
              <option value="ALL">All Statuses</option>
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {/* Payment filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-semibold hidden md:inline">Payment:</span>
            <select
              value={selectedPaymentFilter}
              onChange={(e) => setSelectedPaymentFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-1 focus:ring-primary-500"
            >
              <option value="ALL">All Payments</option>
              <option value="PAID">Paid Only</option>
              <option value="PENDING">Pending (COD/Online)</option>
            </select>
          </div>
        </div>

      </div>

      {/* ORDERS MANAGEMENT TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">Fetching orders queue...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No matching orders found</p>
            <p className="text-xs text-slate-400">Try adjusting your status filters or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-4 px-5">Order #</th>
                  <th className="py-4 px-5">Customer</th>
                  <th className="py-4 px-5">Schedule (Pickup / Del)</th>
                  <th className="py-4 px-5">Amount &amp; Mode</th>
                  <th className="py-4 px-5">Order Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const isUpdating = updatingId === order._id;

                  return (
                    <tr key={order._id} className="hover:bg-slate-50/60 transition-colors">
                      
                      {/* Order Number & Items count */}
                      <td className="py-4 px-5">
                        <span className="font-extrabold text-slate-900 font-mono block">
                          {order.orderNumber}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {order.items?.length || 0} garments • {order.preferences?.packagingType}
                        </span>
                      </td>

                      {/* Customer Info */}
                      <td className="py-4 px-5">
                        <span className="font-bold text-slate-900 block">
                          {order.customer?.name || 'Guest User'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {order.pickupAddress?.contactPhone || order.customer?.phone}
                        </span>
                      </td>

                      {/* Schedule */}
                      <td className="py-4 px-5">
                        <div className="space-y-0.5">
                          <span className="text-slate-800 font-semibold block">
                            P: {order.pickupSchedule?.date}
                          </span>
                          <span className="text-slate-500 text-[10px] block">
                            D: {order.deliverySchedule?.date}
                          </span>
                        </div>
                      </td>

                      {/* Amount & Payment Status */}
                      <td className="py-4 px-5">
                        <span className="font-black text-slate-900 block">
                          ₹{order.pricingBreakdown?.grandTotal}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            order.payment?.status === 'PAID' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`} />
                          <span className={`text-[10px] font-bold ${
                            order.payment?.status === 'PAID' ? 'text-emerald-700' : 'text-amber-700'
                          }`}>
                            {order.payment?.status} ({order.payment?.method})
                          </span>
                        </div>
                      </td>

                      {/* Order Status Dropdown */}
                      <td className="py-4 px-5">
                        <select
                          value={order.orderStatus}
                          disabled={isUpdating}
                          onChange={(e) => handleStatusChange(order._id, e.target.value)}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white font-bold text-xs text-slate-800 focus:ring-1 focus:ring-primary-500"
                        >
                          {STATUS_OPTIONS.map((st) => (
                            <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right space-x-2">
                        {order.payment?.status !== 'PAID' && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleMarkAsPaid(order._id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold text-[11px]"
                            title="Mark Cash Collected on Delivery"
                          >
                            Mark Paid
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setInspectOrder(order)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-primary-600 hover:bg-slate-50"
                          title="View order details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INSPECTION MODAL */}
      {inspectOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Order Inspection: {inspectOrder.orderNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Customer: {inspectOrder.customer?.name} ({inspectOrder.customer?.email})
                </p>
              </div>
              <button
                onClick={() => setInspectOrder(null)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Address & Delivery */}
            <div className="p-4 rounded-2xl bg-slate-50 text-xs space-y-2 border border-slate-200/80">
              <span className="font-bold text-slate-800">Delivery Address:</span>
              <p className="text-slate-600">
                {inspectOrder.pickupAddress?.flatAndBuilding}, {inspectOrder.pickupAddress?.streetAndLandmark}, {inspectOrder.pickupAddress?.city} - {inspectOrder.pickupAddress?.pincode}
              </p>
              <p className="text-slate-600">
                Phone: <span className="font-mono font-bold text-slate-800">{inspectOrder.pickupAddress?.contactPhone}</span>
              </p>
            </div>

            {/* Items Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800">Garment Breakdown:</h4>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs border border-slate-200 rounded-2xl p-3">
                {inspectOrder.items?.map((item, idx) => (
                  <div key={idx} className="py-2 first:pt-0 flex justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{item.garmentName}</span>
                      <span className="text-slate-500 ml-1.5 font-medium">({item.quantity} pcs)</span>
                      <p className="text-[10px] text-slate-400">
                        {item.serviceType.replace(/_/g, ' ')} • {item.ironingType.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <span className="font-bold text-slate-900">₹{item.lineTotal}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-500">Grand Total: </span>
                <span className="font-black text-slate-900 text-sm">₹{inspectOrder.pricingBreakdown?.grandTotal}</span>
              </div>
              <button
                onClick={() => setInspectOrder(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboardPage;
