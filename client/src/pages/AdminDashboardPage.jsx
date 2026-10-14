import React, { useState, useEffect } from 'react';
import { orderService, catalogService } from '../services/api';
import GstInvoiceModal from '../components/GstInvoiceModal';
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
  AlertCircle,
  Bike,
  Tag,
  KeyRound,
  ShieldCheck,
  Percent,
  Edit,
  Plus,
  Layers,
  FileText,
  BarChart3,
  Check,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Zap
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

const GARMENT_CATEGORIES = ['Men', 'Women', 'Household', 'Winter & Heavy'];

const AdminDashboardPage = () => {
  // Navigation Tabs: 'orders' | 'ratecard' | 'coupons'
  const [activeTab, setActiveTab] = useState('orders');

  // =========================================================================
  // TAB 1: ORDERS & LOGISTICS STATE
  // =========================================================================
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectOrder, setInspectOrder] = useState(null);
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Analytics Metrics State
  const [analytics, setAnalytics] = useState({
    totalOrders: 0,
    activeOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    expressOrdersCount: 0,
    totalRevenue: 0,
    settledRevenue: 0,
    pendingCodRevenue: 0
  });

  // =========================================================================
  // TAB 2: GARMENT RATE CARD (CMS) STATE
  // =========================================================================
  const [garments, setGarments] = useState([]);
  const [loadingGarments, setLoadingGarments] = useState(false);
  const [garmentSearch, setGarmentSearch] = useState('');
  const [garmentCategoryFilter, setGarmentCategoryFilter] = useState('All');
  const [editGarmentModal, setEditGarmentModal] = useState(false);
  const [editingGarment, setEditingGarment] = useState(null);
  const [newGarmentModal, setNewGarmentModal] = useState(false);
  const [newGarmentForm, setNewGarmentForm] = useState({
    name: '',
    category: 'Men',
    iconName: 'Shirt',
    pricing: {
      washOnly: 30,
      standardSteamIron: 20,
      crispStarchPress: 35,
      delicatePress: 45,
      dryClean: 90
    },
    isActive: true
  });

  // =========================================================================
  // TAB 3: PROMO COUPONS CMS STATE
  // =========================================================================
  const [coupons, setCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [newCouponModal, setNewCouponModal] = useState(false);
  const [newCouponForm, setNewCouponForm] = useState({
    code: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: 20,
    minOrderSubtotal: 299,
    maxDiscountAmount: 100,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  // =========================================================================
  // FETCHERS
  // =========================================================================
  const fetchRiders = async () => {
    try {
      const res = await orderService.getRiders();
      if (res.success) {
        setRiders(res.riders);
      }
    } catch (err) {
      console.warn('[Admin] Failed to load riders:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await orderService.getAnalytics();
      if (res.success && res.analytics) {
        setAnalytics(res.analytics);
      }
    } catch (err) {
      console.warn('[Admin Analytics Error]:', err);
    }
  };

  const fetchAllOrders = async () => {
    try {
      setLoadingOrders(true);
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
      setLoadingOrders(false);
    }
  };

  const fetchGarments = async () => {
    try {
      setLoadingGarments(true);
      const res = await catalogService.getGarments('', '', true);
      if (res.success && res.data) {
        setGarments(res.data);
      }
    } catch (err) {
      console.error('[Catalog Error]:', err);
      toast.error('Failed to load garments rate card.');
    } finally {
      setLoadingGarments(false);
    }
  };

  const fetchCoupons = async () => {
    try {
      setLoadingCoupons(true);
      const res = await orderService.getAllCoupons();
      if (res.success && res.coupons) {
        setCoupons(res.coupons);
      }
    } catch (err) {
      console.error('[Coupons Error]:', err);
      toast.error('Failed to load coupons.');
    } finally {
      setLoadingCoupons(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
    fetchRiders();
    fetchAnalytics();
  }, [selectedStatusFilter, selectedPaymentFilter]);

  useEffect(() => {
    if (activeTab === 'ratecard') {
      fetchGarments();
    } else if (activeTab === 'coupons') {
      fetchCoupons();
    }
  }, [activeTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAllOrders();
  };

  // =========================================================================
  // ORDER ACTIONS
  // =========================================================================
  const handleAssignRider = async (orderId, riderId) => {
    if (!riderId) return;
    setUpdatingId(orderId);
    try {
      const res = await orderService.assignRider(orderId, riderId);
      if (res.success && res.order) {
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? res.order : o))
        );
        if (inspectOrder && inspectOrder._id === orderId) {
          setInspectOrder(res.order);
        }
        toast.success(res.message || 'Rider assigned successfully!');
        fetchAnalytics();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign rider.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await orderService.updateOrderStatus(orderId, { orderStatus: newStatus });
      if (res.success) {
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, orderStatus: newStatus } : o))
        );
        toast.success(`Order status updated to ${newStatus.replace(/_/g, ' ')}`);
        fetchAnalytics();
      }
    } catch (err) {
      toast.error('Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

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
        fetchAnalytics();
      }
    } catch (err) {
      toast.error('Failed to mark payment as paid.');
    } finally {
      setUpdatingId(null);
    }
  };

  // =========================================================================
  // GARMENT CMS ACTIONS
  // =========================================================================
  const handleToggleGarmentActive = async (garment) => {
    try {
      const res = await catalogService.updateGarment(garment._id, {
        isActive: !garment.isActive
      });
      if (res.success && res.data) {
        setGarments((prev) =>
          prev.map((g) => (g._id === garment._id ? res.data : g))
        );
        toast.success(`${garment.name} is now ${res.data.isActive ? 'Active' : 'Inactive'}`);
      }
    } catch (err) {
      toast.error('Failed to update garment status.');
    }
  };

  const handleCreateGarment = async (e) => {
    e.preventDefault();
    try {
      const res = await catalogService.createGarment(newGarmentForm);
      if (res.success && res.data) {
        setGarments((prev) => [res.data, ...prev]);
        setNewGarmentModal(false);
        setNewGarmentForm({
          name: '',
          category: 'Men',
          iconName: 'Shirt',
          pricing: {
            washOnly: 30,
            standardSteamIron: 20,
            crispStarchPress: 35,
            delicatePress: 45,
            dryClean: 90
          },
          isActive: true
        });
        toast.success(`Created garment: ${res.data.name}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create garment.');
    }
  };

  const handleUpdateGarmentPricing = async (e) => {
    e.preventDefault();
    if (!editingGarment) return;
    try {
      const res = await catalogService.updateGarment(editingGarment._id, {
        name: editingGarment.name,
        category: editingGarment.category,
        pricing: editingGarment.pricing,
        isActive: editingGarment.isActive
      });
      if (res.success && res.data) {
        setGarments((prev) =>
          prev.map((g) => (g._id === editingGarment._id ? res.data : g))
        );
        setEditGarmentModal(false);
        setEditingGarment(null);
        toast.success('Garment rates updated successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update garment rates.');
    }
  };

  // =========================================================================
  // COUPON CMS ACTIONS
  // =========================================================================
  const handleToggleCoupon = async (couponId) => {
    try {
      const res = await orderService.toggleCoupon(couponId);
      if (res.success && res.coupon) {
        setCoupons((prev) =>
          prev.map((c) => (c._id === couponId ? res.coupon : c))
        );
        toast.success(res.message);
      }
    } catch (err) {
      toast.error('Failed to toggle coupon status.');
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newCouponForm,
        discountValue: Number(newCouponForm.discountValue),
        minOrderSubtotal: Number(newCouponForm.minOrderSubtotal) || 0,
        maxDiscountAmount: newCouponForm.maxDiscountAmount ? Number(newCouponForm.maxDiscountAmount) : null
      };

      const res = await orderService.createCoupon(payload);
      if (res.success && res.coupon) {
        setCoupons((prev) => [res.coupon, ...prev]);
        setNewCouponModal(false);
        setNewCouponForm({
          code: '',
          description: '',
          discountType: 'PERCENTAGE',
          discountValue: 20,
          minOrderSubtotal: 299,
          maxDiscountAmount: 100,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
        toast.success(`Coupon ${res.coupon.code} created successfully!`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create coupon.');
    }
  };

  // Filtered Garments for Rate Card Tab
  const filteredGarments = garments.filter((g) => {
    const matchesCat = garmentCategoryFilter === 'All' || g.category === garmentCategoryFilter;
    const matchesQuery = !garmentSearch || g.name.toLowerCase().includes(garmentSearch.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Dhobi Operations Hub
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-800 text-xs font-bold uppercase">
              Admin CMS &amp; Dispatch
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage live doorstep queues, live rates rate-card CMS, commercial promo coupons &amp; revenue analytics.
          </p>
        </div>

        {/* 3 Operational Tabs */}
        <div className="flex items-center p-1.5 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold self-start md:self-auto">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-white text-primary-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Live Orders &amp; Dispatch</span>
          </button>

          <button
            onClick={() => setActiveTab('ratecard')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ratecard'
                ? 'bg-white text-primary-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Garment Rate Card (CMS)</span>
          </button>

          <button
            onClick={() => setActiveTab('coupons')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'coupons'
                ? 'bg-white text-primary-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Promo Coupons CMS</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: LIVE ORDERS & REVENUE ANALYTICS */}
      {/* ===================================================================== */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* REVENUE & OPERATIONAL ANALYTICS CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                <span>Total Orders</span>
                <Package className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl font-black text-slate-900">{analytics.totalOrders || orders.length}</p>
              <span className="text-[10px] text-slate-400 block">{analytics.activeOrders} active in pipeline</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-amber-600 text-xs font-bold">
                <span>Active Pickups</span>
                <Truck className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-amber-700">
                {orders.filter((o) => ['BOOKED', 'PICKUP_ASSIGNED'].includes(o.orderStatus)).length}
              </p>
              <span className="text-[10px] text-slate-400 block">Pending rider doorstep pickup</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-indigo-600 text-xs font-bold">
                <span>24h Express</span>
                <Zap className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-2xl font-black text-indigo-700">
                {analytics.expressOrdersCount || orders.filter((o) => o.isExpress).length}
              </p>
              <span className="text-[10px] text-slate-400 block">Priority turnaround (+₹99)</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-emerald-600 text-xs font-bold">
                <span>Settled Revenue</span>
                <IndianRupee className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-emerald-700">₹{analytics.settledRevenue.toLocaleString('en-IN')}</p>
              <span className="text-[10px] text-slate-400 block">Reconciled Online &amp; COD Paid</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1 col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between text-primary-600 text-xs font-bold">
                <span>Pending COD</span>
                <IndianRupee className="w-4 h-4 text-primary-500" />
              </div>
              <p className="text-2xl font-black text-primary-700">₹{analytics.pendingCodRevenue.toLocaleString('en-IN')}</p>
              <span className="text-[10px] text-slate-400 block">Cash due upon delivery</span>
            </div>

          </div>

          {/* FILTERS & SEARCH BAR */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            
            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Order ID, Bag Tag (BAG-XXX), or Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
              />
            </form>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-semibold hidden sm:inline">Status:</span>
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

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-semibold hidden sm:inline">Payment:</span>
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

              <button
                onClick={fetchAllOrders}
                className="p-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                title="Refresh Orders"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* ORDERS MANAGEMENT TABLE */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loadingOrders ? (
              <div className="p-16 text-center">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">Fetching orders queue...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No matching orders found</p>
                <p className="text-xs text-slate-400">Try adjusting your status filter or search query.</p>
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
                      <th className="py-4 px-5">Rider &amp; Bag</th>
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
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-slate-400">
                                {order.items?.length || 0} items
                              </span>
                              {order.isExpress && (
                                <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[9px] font-bold">
                                  ⚡ 24h Express
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Customer Info */}
                          <td className="py-4 px-5">
                            <span className="font-bold text-slate-900 block">
                              {order.customer?.name || 'Customer'}
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

                          {/* Amount & Mode */}
                          <td className="py-4 px-5">
                            <span className="font-extrabold text-slate-900 block">
                              ₹{order.pricingBreakdown?.grandTotal}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`px-1.5 py-0.5 rounded-full font-bold text-[9px] ${
                                order.payment?.status === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {order.payment?.method} ({order.payment?.status})
                              </span>
                            </div>
                          </td>

                          {/* Rider & Bag Tag */}
                          <td className="py-4 px-5">
                            <div className="space-y-1">
                              <select
                                value={order.logistics?.assignedRider?._id || ''}
                                onChange={(e) => handleAssignRider(order._id, e.target.value)}
                                disabled={isUpdating || order.orderStatus === 'CANCELLED'}
                                className="px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-medium bg-white focus:ring-1 focus:ring-primary-500 w-36 truncate"
                              >
                                <option value="">Assign Rider...</option>
                                {riders.map((r) => (
                                  <option key={r._id} value={r._id}>
                                    {r.name}
                                  </option>
                                ))}
                              </select>

                              {order.logistics?.bagTagId ? (
                                <span className="px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-700 font-mono text-[10px] font-bold block w-fit">
                                  🏷️ {order.logistics.bagTagId}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 block italic">No bag tag yet</span>
                              )}
                            </div>
                          </td>

                          {/* Order Status Dropdown */}
                          <td className="py-4 px-5">
                            <select
                              value={order.orderStatus}
                              onChange={(e) => handleStatusChange(order._id, e.target.value)}
                              disabled={isUpdating || order.orderStatus === 'CANCELLED'}
                              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs border focus:outline-hidden ${
                                order.orderStatus === 'DELIVERED'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : order.orderStatus === 'CANCELLED'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : order.orderStatus.includes('IN_')
                                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {STATUS_OPTIONS.map((st) => (
                                <option key={st} value={st}>
                                  {st.replace(/_/g, ' ')}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-5 text-right space-x-2">
                            {/* COD Mark as Paid Button */}
                            {order.payment?.method === 'COD' && order.payment?.status === 'PENDING' && order.orderStatus !== 'CANCELLED' && (
                              <button
                                onClick={() => handleMarkAsPaid(order._id)}
                                disabled={isUpdating}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-colors"
                                title="Reconcile Cash Collection"
                              >
                                Mark Paid
                              </button>
                            )}

                            {/* View / Print GST Invoice */}
                            <button
                              onClick={() => setInvoiceOrder(order)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                              title="Print GST Invoice"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>

                            {/* Inspect Details Modal */}
                            <button
                              onClick={() => setInspectOrder(order)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                              title="Inspect Full Order"
                            >
                              <Eye className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: GARMENT RATE CARD CMS */}
      {/* ===================================================================== */}
      {activeTab === 'ratecard' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter garments..."
                  value={garmentSearch}
                  onChange={(e) => setGarmentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden"
                />
              </div>

              <select
                value={garmentCategoryFilter}
                onChange={(e) => setGarmentCategoryFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium"
              >
                <option value="All">All Categories</option>
                {GARMENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setNewGarmentModal(true)}
              className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-primary-600/30 cursor-pointer self-start md:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Garment</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loadingGarments ? (
              <div className="p-16 text-center">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">Loading garment rate card...</p>
              </div>
            ) : filteredGarments.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No garments match your filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="py-4 px-5">Garment Name</th>
                      <th className="py-4 px-5">Category</th>
                      <th className="py-4 px-4 text-center">Wash (₹)</th>
                      <th className="py-4 px-4 text-center">Steam Iron (₹)</th>
                      <th className="py-4 px-4 text-center">Crisp Starch (₹)</th>
                      <th className="py-4 px-4 text-center">Delicate (₹)</th>
                      <th className="py-4 px-4 text-center">Dry Clean (₹)</th>
                      <th className="py-4 px-4 text-center">Status</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredGarments.map((g) => (
                      <tr key={g._id} className="hover:bg-slate-50/60">
                        <td className="py-3.5 px-5 font-bold text-slate-900">{g.name}</td>
                        <td className="py-3.5 px-5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                            {g.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-800">₹{g.pricing.washOnly}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-800">₹{g.pricing.standardSteamIron}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-800">₹{g.pricing.crispStarchPress}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-800">₹{g.pricing.delicatePress}</td>
                        <td className="py-3.5 px-4 text-center font-extrabold text-primary-600">₹{g.pricing.dryClean}</td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleToggleGarmentActive(g)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                              g.isActive
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                          >
                            {g.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </button>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            onClick={() => {
                              setEditingGarment({ ...g });
                              setEditGarmentModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Edit Rates</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: PROMO COUPONS CMS */}
      {/* ===================================================================== */}
      {activeTab === 'coupons' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Commercial Promo Engine</h3>
              <p className="text-xs text-slate-500">Configure discount percentages, flat waivers, thresholds and validity.</p>
            </div>

            <button
              onClick={() => setNewCouponModal(true)}
              className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-primary-600/30 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Coupon</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loadingCoupons ? (
              <div className="p-16 text-center">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">Loading coupon engine...</p>
              </div>
            ) : coupons.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No coupons found. Click Create Coupon to add one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="py-4 px-5">Promo Code</th>
                      <th className="py-4 px-5">Description</th>
                      <th className="py-4 px-4 text-center">Discount</th>
                      <th className="py-4 px-4 text-center">Min Subtotal</th>
                      <th className="py-4 px-4 text-center">Max Cap</th>
                      <th className="py-4 px-4 text-center">Expires On</th>
                      <th className="py-4 px-4 text-center">Status</th>
                      <th className="py-4 px-5 text-right">Toggle Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {coupons.map((c) => (
                      <tr key={c._id} className="hover:bg-slate-50/60">
                        <td className="py-3.5 px-5 font-black text-slate-900 font-mono text-sm tracking-wide">
                          {c.code}
                        </td>
                        <td className="py-3.5 px-5 text-slate-600">{c.description}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-primary-700">
                          {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% OFF` : `₹${c.discountValue} FLAT`}
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-800 font-semibold">₹{c.minOrderSubtotal}</td>
                        <td className="py-3.5 px-4 text-center text-slate-800 font-semibold">
                          {c.maxDiscountAmount ? `₹${c.maxDiscountAmount}` : 'None'}
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-500">
                          {new Date(c.expiresAt).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {c.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            onClick={() => handleToggleCoupon(c._id)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              c.isActive
                                ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            {c.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: EDIT GARMENT RATES (CMS) */}
      {/* ===================================================================== */}
      {editGarmentModal && editingGarment && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">Edit Garment Rate Card</h3>
                <p className="text-xs text-slate-500">Modify 5-tier service prices for {editingGarment.name}</p>
              </div>
              <button
                onClick={() => setEditGarmentModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateGarmentPricing} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Garment Name</label>
                <input
                  type="text"
                  required
                  value={editingGarment.name}
                  onChange={(e) => setEditingGarment({ ...editingGarment, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={editingGarment.category}
                  onChange={(e) => setEditingGarment({ ...editingGarment, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold bg-white"
                >
                  {GARMENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Wash Only (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingGarment.pricing.washOnly}
                    onChange={(e) => setEditingGarment({
                      ...editingGarment,
                      pricing: { ...editingGarment.pricing, washOnly: e.target.value }
                    })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Steam Iron (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingGarment.pricing.standardSteamIron}
                    onChange={(e) => setEditingGarment({
                      ...editingGarment,
                      pricing: { ...editingGarment.pricing, standardSteamIron: e.target.value }
                    })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Crisp Starch (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingGarment.pricing.crispStarchPress}
                    onChange={(e) => setEditingGarment({
                      ...editingGarment,
                      pricing: { ...editingGarment.pricing, crispStarchPress: e.target.value }
                    })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Delicate Press (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingGarment.pricing.delicatePress}
                    onChange={(e) => setEditingGarment({
                      ...editingGarment,
                      pricing: { ...editingGarment.pricing, delicatePress: e.target.value }
                    })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dry Clean (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingGarment.pricing.dryClean}
                    onChange={(e) => setEditingGarment({
                      ...editingGarment,
                      pricing: { ...editingGarment.pricing, dryClean: e.target.value }
                    })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-primary-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditGarmentModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold"
                >
                  Save Rates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ADD NEW GARMENT (CMS) */}
      {/* ===================================================================== */}
      {newGarmentModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">Add New Garment to Catalog</h3>
                <p className="text-xs text-slate-500">Configure base pricing across all 5 finishing tiers</p>
              </div>
              <button
                onClick={() => setNewGarmentModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGarment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Garment Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Designer Sherwani"
                  value={newGarmentForm.name}
                  onChange={(e) => setNewGarmentForm({ ...newGarmentForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category *</label>
                <select
                  value={newGarmentForm.category}
                  onChange={(e) => setNewGarmentForm({ ...newGarmentForm, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold bg-white"
                >
                  {GARMENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Wash Only (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newGarmentForm.pricing.washOnly}
                    onChange={(e) => setNewGarmentForm({
                      ...newGarmentForm,
                      pricing: { ...newGarmentForm.pricing, washOnly: Number(e.target.value) }
                    })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Steam Iron (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newGarmentForm.pricing.standardSteamIron}
                    onChange={(e) => setNewGarmentForm({
                      ...newGarmentForm,
                      pricing: { ...newGarmentForm.pricing, standardSteamIron: Number(e.target.value) }
                    })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Crisp Starch (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newGarmentForm.pricing.crispStarchPress}
                    onChange={(e) => setNewGarmentForm({
                      ...newGarmentForm,
                      pricing: { ...newGarmentForm.pricing, crispStarchPress: Number(e.target.value) }
                    })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Delicate Press (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newGarmentForm.pricing.delicatePress}
                    onChange={(e) => setNewGarmentForm({
                      ...newGarmentForm,
                      pricing: { ...newGarmentForm.pricing, delicatePress: Number(e.target.value) }
                    })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dry Clean (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newGarmentForm.pricing.dryClean}
                    onChange={(e) => setNewGarmentForm({
                      ...newGarmentForm,
                      pricing: { ...newGarmentForm.pricing, dryClean: Number(e.target.value) }
                    })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-primary-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewGarmentModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold cursor-pointer"
                >
                  Create Garment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CREATE PROMO COUPON */}
      {/* ===================================================================== */}
      {newCouponModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">Create Commercial Promo Code</h3>
                <p className="text-xs text-slate-500">Configure discount value, thresholds and validity</p>
              </div>
              <button
                onClick={() => setNewCouponModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MONSOON100"
                    value={newCouponForm.code}
                    onChange={(e) => setNewCouponForm({ ...newCouponForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Discount Type *</label>
                  <select
                    value={newCouponForm.discountType}
                    onChange={(e) => setNewCouponForm({ ...newCouponForm, discountType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
                  >
                    <option value="PERCENTAGE">PERCENTAGE (%)</option>
                    <option value="FLAT">FLAT (₹)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flat ₹100 OFF on orders above ₹499"
                  value={newCouponForm.description}
                  onChange={(e) => setNewCouponForm({ ...newCouponForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {newCouponForm.discountType === 'PERCENTAGE' ? 'Discount % *' : 'Flat ₹ *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newCouponForm.discountValue}
                    onChange={(e) => setNewCouponForm({ ...newCouponForm, discountValue: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Min Subtotal (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={newCouponForm.minOrderSubtotal}
                    onChange={(e) => setNewCouponForm({ ...newCouponForm, minOrderSubtotal: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max Cap (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Optional"
                    value={newCouponForm.maxDiscountAmount || ''}
                    onChange={(e) => setNewCouponForm({ ...newCouponForm, maxDiscountAmount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Expiry Date *</label>
                <input
                  type="date"
                  required
                  value={newCouponForm.expiresAt}
                  onChange={(e) => setNewCouponForm({ ...newCouponForm, expiresAt: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewCouponModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold cursor-pointer"
                >
                  Create Promo Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: INSPECT ORDER DETAILS */}
      {/* ===================================================================== */}
      {inspectOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs text-slate-400 font-mono">Detailed Inspection</span>
                <h3 className="text-lg font-black text-slate-900 font-mono">{inspectOrder.orderNumber}</h3>
              </div>
              <button
                onClick={() => setInspectOrder(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* OTP Support Block */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-2">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>Support OTP Verification Codes</span>
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[10px] text-slate-400 block font-semibold">Pickup OTP</span>
                  <span className="font-mono font-black text-amber-800 text-base">
                    {inspectOrder.verificationCodes?.pickupOtp || 'N/A'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[10px] text-slate-400 block font-semibold">Delivery OTP</span>
                  <span className="font-mono font-black text-amber-800 text-base">
                    {inspectOrder.verificationCodes?.deliveryOtp || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Logistics & Rider Info */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Bike className="w-4 h-4 text-teal-600" />
                <span>Logistics &amp; Fleet State</span>
              </span>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-500 block">Assigned Rider:</span>
                  <select
                    value={inspectOrder.logistics?.assignedRider?._id || ''}
                    onChange={(e) => handleAssignRider(inspectOrder._id, e.target.value)}
                    className="mt-1 w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800"
                  >
                    <option value="">No Rider Assigned</option>
                    {riders.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block">Bag Tag ID:</span>
                  <div className="mt-1 font-mono font-bold text-slate-800 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200">
                    {inspectOrder.logistics?.bagTagId || 'Not assigned yet'}
                  </div>
                </div>
              </div>

              {inspectOrder.logistics?.inspectionNotes && (
                <div className="p-2 rounded-xl bg-amber-50 text-amber-900 text-[11px] border border-amber-200">
                  <strong>Pickup Inspection:</strong> {inspectOrder.logistics.inspectionNotes}
                </div>
              )}
            </div>

            {/* Address & Delivery */}
            <div className="p-3.5 rounded-2xl bg-slate-50 text-xs space-y-1.5 border border-slate-200/80">
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
              <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 text-xs border border-slate-200 rounded-2xl p-3">
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

            {/* Audit Trail Timeline */}
            {inspectOrder.statusHistory && inspectOrder.statusHistory.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800">Audit Trail:</h4>
                <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-2xl p-3 space-y-2 text-xs">
                  {inspectOrder.statusHistory.map((hist, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1.5 last:border-b-0 last:pb-0">
                      <div>
                        <span className="font-bold text-slate-900">{hist.status.replace(/_/g, ' ')}</span>
                        {hist.note && <p className="text-slate-500 text-[10px]">{hist.note}</p>}
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(hist.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-500">Grand Total: </span>
                <span className="font-black text-slate-900 text-sm">₹{inspectOrder.pricingBreakdown?.grandTotal}</span>
              </div>
              <button
                onClick={() => setInspectOrder(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: PRINT GST TAX INVOICE */}
      {/* ===================================================================== */}
      {invoiceOrder && (
        <GstInvoiceModal
          order={invoiceOrder}
          onClose={() => setInvoiceOrder(null)}
        />
      )}

    </div>
  );
};

export default AdminDashboardPage;
