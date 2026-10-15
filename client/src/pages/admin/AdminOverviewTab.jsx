import React from 'react';
import { 
  IndianRupee, 
  Package, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Bike, 
  Users, 
  Zap, 
  ArrowRight, 
  Truck, 
  Layers, 
  Bell, 
  Tag, 
  Settings, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';

const AdminOverviewTab = ({
  analytics,
  orders = [],
  riders = [],
  onNavigateTab
}) => {
  // Compute stage breakdown
  const getCountByStatus = (statuses) => {
    return orders.filter((o) => statuses.includes(o.orderStatus)).length;
  };

  const pipeline = [
    { label: 'Placed / Booked', count: getCountByStatus(['ORDER_PLACED', 'BOOKED']), color: 'bg-blue-500' },
    { label: 'Pickup Scheduled', count: getCountByStatus(['PICKUP_SCHEDULED', 'PICKUP_ASSIGNED']), color: 'bg-indigo-500' },
    { label: 'Out for Pickup', count: getCountByStatus(['OUT_FOR_PICKUP']), color: 'bg-amber-500' },
    { label: 'Picked Up', count: getCountByStatus(['PICKED_UP']), color: 'bg-teal-500' },
    { label: 'In Washing', count: getCountByStatus(['IN_WASH', 'IN_WASHING']), color: 'bg-sky-500' },
    { label: 'In Ironing', count: getCountByStatus(['IN_IRONING']), color: 'bg-cyan-500' },
    { label: 'Ready / QC', count: getCountByStatus(['READY', 'QUALITY_CHECK']), color: 'bg-emerald-500' },
    { label: 'Out for Delivery', count: getCountByStatus(['OUT_FOR_DELIVERY']), color: 'bg-purple-500' },
    { label: 'Delivered', count: getCountByStatus(['DELIVERED']), color: 'bg-green-600' },
    { label: 'Cancelled', count: getCountByStatus(['CANCELLED']), color: 'bg-rose-500' }
  ];

  return (
    <div className="space-y-6">
      {/* Primary Financial & Volume KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Pipeline</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">
              ₹{(analytics?.totalRevenue || 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Settled Online */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Settled & Paid</p>
            <p className="text-2xl font-black text-emerald-700 mt-0.5">
              ₹{(analytics?.settledRevenue || 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Active Orders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active In-Flight</p>
            <p className="text-2xl font-black text-blue-700 mt-0.5">
              {analytics?.activeOrders || orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.orderStatus)).length}
            </p>
          </div>
        </div>

        {/* Pending COD */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending COD</p>
            <p className="text-2xl font-black text-amber-700 mt-0.5">
              ₹{(analytics?.pendingCodRevenue || 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      {/* Operational Pipeline Status Funnel */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">10-Stage Order Pipeline Distribution</h3>
            <p className="text-xs text-slate-500">Live order progression across pickup, processing, and delivery</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('orders')}
            className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 hover:underline"
          >
            <span>View All Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {pipeline.map((item) => (
            <div
              key={item.label}
              onClick={() => onNavigateTab('orders')}
              className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-100"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                <span className="text-xs font-semibold text-slate-600 truncate">{item.label}</span>
              </div>
              <p className="text-xl font-black text-slate-900">{item.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Action Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Rider Fleet Card */}
        <div
          onClick={() => onNavigateTab('riders')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-primary-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Bike className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Rider Fleet Operations</h4>
            <p className="text-xs text-slate-500 mt-1">
              Onboard drivers, manage live tasks, track completed deliveries, and assign operational zones.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-600">
            <span>{riders.length} Registered Riders</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Users Directory Card */}
        <div
          onClick={() => onNavigateTab('users')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-primary-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Customer Directory</h4>
            <p className="text-xs text-slate-500 mt-1">
              Inspect user accounts, verify phone status, view saved delivery address books, and toggle access.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
            <span>Manage Users</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Payments Ledger Card */}
        <div
          onClick={() => onNavigateTab('payments')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-primary-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <IndianRupee className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Payments & Reconciliations</h4>
            <p className="text-xs text-slate-500 mt-1">
              Audit cash collected by riders at doorstep, view Razorpay transactions, and generate GST invoices.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600">
            <span>Audit Transactions</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Broadcast Alerts Card */}
        <div
          onClick={() => onNavigateTab('notifications')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-primary-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Bell className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Broadcast Announcements</h4>
            <p className="text-xs text-slate-500 mt-1">
              Dispatch instant promo alerts, festival discounts, and system operational notices to all active users.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-600">
            <span>Send Alert</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverviewTab;
