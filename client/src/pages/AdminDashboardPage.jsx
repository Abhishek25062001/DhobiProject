import React, { useState, useEffect } from 'react';
import { orderService, catalogService, configService } from '../services/api';
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
  Zap,
  Sliders,
  Upload,
  Image as ImageIcon,
  Settings,
  Camera,
  Trash2,
  Building2,
  Menu,
  ChevronRight,
  Radio,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

import AdminOverviewTab from './admin/AdminOverviewTab';
import AdminRidersTab from './admin/AdminRidersTab';
import AdminUsersTab from './admin/AdminUsersTab';
import AdminCategoriesTab from './admin/AdminCategoriesTab';
import AdminPaymentsTab from './admin/AdminPaymentsTab';
import AdminNotificationsTab from './admin/AdminNotificationsTab';

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
  // Navigation Tabs: 'overview' | 'orders' | 'riders' | 'users' | 'products' | 'payments' | 'coupons' | 'config'
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [productSubTab, setProductSubTab] = useState('ratecard');
  const [configSubTab, setConfigSubTab] = useState('settings');

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
  const [uploadingGarmentImage, setUploadingGarmentImage] = useState(false);
  const [newGarmentForm, setNewGarmentForm] = useState({
    name: '',
    category: 'Men',
    iconName: 'Shirt',
    imageUrl: '',
    cloudinaryPublicId: '',
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
  // TAB 4: PLATFORM SETTINGS & SLOTS CMS STATE
  // =========================================================================
  const [platformSettings, setPlatformSettings] = useState({
    businessName: 'IndoDhobi Laundry & Dry Cleaning Pvt. Ltd.',
    gstin: '07AABCI1234F1Z5',
    sacCode: '999712',
    supportPhone: '+91 98765 43210',
    freeDeliveryThreshold: 399,
    deliveryFee: 49,
    expressSurcharge: 99,
    gstPercentage: 5,
    minStandardTurnaroundHours: 24,
    detergentOptions: [],
    packagingOptions: []
  });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const [adminSlots, setAdminSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [newSlotModal, setNewSlotModal] = useState(false);
  const [newSlotForm, setNewSlotForm] = useState({
    label: '',
    startHour: 8,
    endHour: 10,
    maxCapacity: 15,
    sortOrder: 1,
    isActive: true
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

  const fetchPlatformSettings = async () => {
    try {
      setLoadingSettings(true);
      const res = await configService.getPublicConfig();
      if (res.success && res.config) {
        setPlatformSettings(res.config);
      }
    } catch (err) {
      console.error('[Settings Error]:', err);
      toast.error('Failed to load platform settings.');
    } finally {
      setLoadingSettings(false);
    }
  };

  const fetchAdminSlots = async () => {
    try {
      setLoadingSlots(true);
      const res = await configService.getAllSlots();
      if (res.success && res.slots) {
        setAdminSlots(res.slots);
      }
    } catch (err) {
      console.error('[Slots Error]:', err);
      toast.error('Failed to load dynamic time slots.');
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
    fetchRiders();
    fetchAnalytics();
  }, [selectedStatusFilter, selectedPaymentFilter]);

  useEffect(() => {
    if (activeTab === 'ratecard' || activeTab === 'products') {
      fetchGarments();
    } else if (activeTab === 'coupons') {
      fetchCoupons();
    } else if (activeTab === 'settings' || activeTab === 'config') {
      fetchPlatformSettings();
      fetchAdminSlots();
    } else if (activeTab === 'overview' || activeTab === 'orders') {
      fetchAllOrders();
      fetchRiders();
      fetchAnalytics();
    }
  }, [activeTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAllOrders();
  };

  // =========================================================================
  // ORDER ACTIONS
  // =========================================================================
  const handleAssignRider = async (orderId, riderId, leg = undefined) => {
    if (!riderId) return;
    setUpdatingId(orderId);
    try {
      const res = await orderService.assignRider(orderId, riderId, leg);
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
          imageUrl: '',
          cloudinaryPublicId: '',
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

  const handleUploadGarmentImage = async (file, isEditing = false) => {
    if (!file) return;
    setUploadingGarmentImage(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;
      const res = await configService.uploadImage(base64, 'indodhobi/garments');
      if (res.success && res.imageUrl) {
        if (isEditing) {
          setEditingGarment((prev) => ({
            ...prev,
            imageUrl: res.imageUrl,
            cloudinaryPublicId: res.publicId || ''
          }));
        } else {
          setNewGarmentForm((prev) => ({
            ...prev,
            imageUrl: res.imageUrl,
            cloudinaryPublicId: res.publicId || ''
          }));
        }
        toast.success('Garment photo uploaded to Cloudinary!');
      }
    } catch (err) {
      toast.error('Failed to upload garment photo.');
    } finally {
      setUploadingGarmentImage(false);
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
        isActive: editingGarment.isActive,
        imageUrl: editingGarment.imageUrl,
        cloudinaryPublicId: editingGarment.cloudinaryPublicId
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
  // TAB 4: PLATFORM SETTINGS & DYNAMIC SLOTS ACTIONS
  // =========================================================================
  const handleSavePlatformSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const res = await configService.updateSettings(platformSettings);
      if (res.success) {
        setPlatformSettings(res.config);
        toast.success('Platform configuration saved successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update platform settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    try {
      const res = await configService.createSlot(newSlotForm);
      if (res.success && res.slot) {
        setAdminSlots((prev) => [...prev, res.slot]);
        setNewSlotModal(false);
        setNewSlotForm({
          label: '',
          startHour: 8,
          endHour: 10,
          maxCapacity: 15,
          sortOrder: adminSlots.length + 1,
          isActive: true
        });
        toast.success(`Created slot: ${res.slot.label}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create time slot.');
    }
  };

  const handleUpdateSlotCapacity = async (slotId, maxCapacity) => {
    try {
      const res = await configService.updateSlot(slotId, { maxCapacity: Number(maxCapacity) });
      if (res.success && res.slot) {
        setAdminSlots((prev) => prev.map((s) => (s._id === slotId ? res.slot : s)));
        toast.success('Slot capacity updated!');
      }
    } catch (err) {
      toast.error('Failed to update slot capacity.');
    }
  };

  const handleToggleSlotActive = async (slot) => {
    try {
      const res = await configService.updateSlot(slot._id, { isActive: !slot.isActive });
      if (res.success && res.slot) {
        setAdminSlots((prev) => prev.map((s) => (s._id === slot._id ? res.slot : s)));
        toast.success(`Slot ${slot.label} ${!slot.isActive ? 'activated' : 'deactivated'}!`);
      }
    } catch (err) {
      toast.error('Failed to update slot status.');
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

  const navItems = [
    { id: 'overview', label: 'Command Overview', icon: BarChart3 },
    { 
      id: 'orders', 
      label: 'Orders & Queue', 
      icon: Truck, 
      badge: orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.orderStatus)).length 
    },
    { 
      id: 'riders', 
      label: 'Rider Fleet', 
      icon: Bike, 
      badge: riders.length 
    },
    { id: 'users', label: 'Users Directory', icon: Users },
    { id: 'products', label: 'Products & Categories', icon: Layers },
    { id: 'payments', label: 'Payments Ledger', icon: IndianRupee },
    { id: 'coupons', label: 'Coupons & Promos', icon: Tag },
    { id: 'config', label: 'Platform & Alerts', icon: Sliders },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      
      {/* Top Bar with Title, Real DB Badge & Mobile Toggle */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 cursor-pointer"
            title="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Dhobi Operations Command Center
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Real DB Atlas Connected
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
              Centralized administrative dispatch, fleet monitoring, dynamic catalog, payments ledger, and platform controls.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              fetchAllOrders();
              fetchRiders();
              fetchAnalytics();
              if (activeTab === 'products' || activeTab === 'ratecard') fetchGarments();
              if (activeTab === 'coupons') fetchCoupons();
              if (activeTab === 'config' || activeTab === 'settings') {
                fetchPlatformSettings();
                fetchAdminSlots();
              }
              toast.success('Live data synchronized with MongoDB');
            }}
            className="p-2 text-slate-600 hover:text-primary-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="Synchronize All Live Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 2-Column Command Center Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Navigation Sidebar on Desktop */}
        <aside className="hidden lg:block w-64 shrink-0 bg-white rounded-3xl border border-slate-200/80 p-4 space-y-4 shadow-xs sticky top-24">
          <div className="px-2 py-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Command Modules
            </p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActiveItem = activeTab === item.id || 
                (item.id === 'products' && activeTab === 'ratecard') ||
                (item.id === 'config' && activeTab === 'settings');

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                    isActiveItem
                      ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/30 font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className={`w-4 h-4 ${isActiveItem ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isActiveItem ? 'bg-white text-primary-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-slate-100 px-2">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-1 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Access Level</span>
              <span className="text-xs font-black text-slate-800 block">Super Administrator</span>
              <span className="text-[10px] text-emerald-600 font-semibold block">Full Read/Write Authorized</span>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Slide-Over Drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden bg-slate-900/60 backdrop-blur-xs flex">
            <div className="w-72 bg-white h-full p-5 space-y-4 shadow-2xl flex flex-col justify-between animate-in slide-in-from-left duration-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary-600 text-white flex items-center justify-center font-bold">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">IndoDhobi Admin</h3>
                      <p className="text-[10px] text-slate-400">Control Center</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const isActiveItem = activeTab === item.id || 
                      (item.id === 'products' && activeTab === 'ratecard') ||
                      (item.id === 'config' && activeTab === 'settings');

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(item.id);
                          setSidebarOpen(false);
                        }}
                        className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                          isActiveItem
                            ? 'bg-primary-600 text-white font-extrabold'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <item.icon className={`w-4 h-4 ${isActiveItem ? 'text-white' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </div>

                        {item.badge !== undefined && item.badge > 0 && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            isActiveItem ? 'bg-white text-primary-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-3 border-t border-slate-100 text-center">
                <span className="text-[11px] text-slate-400 font-medium">Logged in as Ops Admin</span>
              </div>
            </div>
            <div className="flex-1" onClick={() => setSidebarOpen(false)} />
          </div>
        )}

        {/* Right Content Area */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          {/* ================================================================= */}
          {/* TAB 0: DASHBOARD OVERVIEW */}
          {/* ================================================================= */}
          {activeTab === 'overview' && (
            <AdminOverviewTab
              analytics={analytics}
              orders={orders}
              riders={riders}
              onNavigateTab={(tab) => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}

          {/* ================================================================= */}
          {/* TAB 1: LIVE ORDERS & REVENUE ANALYTICS */}
          {/* ================================================================= */}
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
      {/* TAB 2: RIDERS FLEET (REQUIREMENT #6) */}
      {/* ===================================================================== */}
      {activeTab === 'riders' && (
        <AdminRidersTab />
      )}

      {/* ===================================================================== */}
      {/* TAB 3: USERS & ADDRESSES DIRECTORY (REQUIREMENT #7) */}
      {/* ===================================================================== */}
      {activeTab === 'users' && (
        <AdminUsersTab />
      )}

      {/* ===================================================================== */}
      {/* TAB 4: PRODUCTS & DYNAMIC CATEGORIES (REQUIREMENT #7) */}
      {/* ===================================================================== */}
      {(activeTab === 'products' || activeTab === 'ratecard') && (
        <div className="space-y-6">
          {/* Subtab Switcher */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit text-xs font-bold">
            <button
              type="button"
              onClick={() => setProductSubTab('ratecard')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                productSubTab === 'ratecard'
                  ? 'bg-white text-primary-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Garment Rate Card (CMS)
            </button>
            <button
              type="button"
              onClick={() => setProductSubTab('categories')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                productSubTab === 'categories'
                  ? 'bg-white text-primary-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dynamic Categories (CMS)
            </button>
          </div>

          {productSubTab === 'categories' ? (
            <AdminCategoriesTab />
          ) : (
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
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
                              {g.imageUrl ? (
                                <img src={g.imageUrl} alt={g.name} className="w-full h-full object-cover" />
                              ) : (
                                <Layers className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <span className="font-bold text-slate-900">{g.name}</span>
                          </div>
                        </td>
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
    </div>
  )}

      {/* ===================================================================== */}
      {/* TAB 5: PAYMENTS & TRANSACTIONS LEDGER (REQUIREMENT #7) */}
      {/* ===================================================================== */}
      {activeTab === 'payments' && (
        <AdminPaymentsTab />
      )}

      {/* ===================================================================== */}
      {/* TAB 6: PROMO COUPONS CMS */}
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
      {/* TAB 7: PLATFORM SETTINGS & BROADCASTS (REQUIREMENT #7) */}
      {/* ===================================================================== */}
      {(activeTab === 'config' || activeTab === 'settings') && (
        <div className="space-y-6">
          {/* Subtab Switcher */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit text-xs font-bold">
            <button
              type="button"
              onClick={() => setConfigSubTab('settings')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                configSubTab === 'settings'
                  ? 'bg-white text-primary-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Platform Fees & Logistics Slots
            </button>
            <button
              type="button"
              onClick={() => setConfigSubTab('broadcast')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                configSubTab === 'broadcast'
                  ? 'bg-white text-primary-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Broadcast Announcements & Alerts
            </button>
          </div>

          {configSubTab === 'broadcast' ? (
            <AdminNotificationsTab />
          ) : (
            <div className="space-y-8">
          {/* Section 1: Business Profile & Pricing Rules */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary-600" />
                  <span>Platform Pricing Rules &amp; Business Metadata</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time MongoDB settings that instantly dictate checkout totals, GST invoices, and delivery fees.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchPlatformSettings}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload</span>
              </button>
            </div>

            {loadingSettings ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Loading platform configuration...</p>
              </div>
            ) : (
              <form onSubmit={handleSavePlatformSettings} className="space-y-6 text-xs">
                {/* Pricing Rules Grid */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    1. Live Pricing &amp; Order Rules
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <label className="font-bold text-slate-700 block text-[11px]">
                        Free Delivery Threshold (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={platformSettings.freeDeliveryThreshold}
                        onChange={(e) => setPlatformSettings({ ...platformSettings, freeDeliveryThreshold: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white text-slate-900"
                      />
                      <span className="text-[10px] text-slate-400 block">Orders at or above this amount get free delivery</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <label className="font-bold text-slate-700 block text-[11px]">
                        Standard Delivery Fee (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={platformSettings.deliveryFee}
                        onChange={(e) => setPlatformSettings({ ...platformSettings, deliveryFee: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white text-slate-900"
                      />
                      <span className="text-[10px] text-slate-400 block">Applied when subtotal &lt; free threshold</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <label className="font-bold text-slate-700 block text-[11px]">
                        Express 24h Surcharge (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={platformSettings.expressSurcharge}
                        onChange={(e) => setPlatformSettings({ ...platformSettings, expressSurcharge: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white text-slate-900"
                      />
                      <span className="text-[10px] text-slate-400 block">Fast 24-hour turnaround fee</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <label className="font-bold text-slate-700 block text-[11px]">
                        GST Percentage (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        value={platformSettings.gstPercentage}
                        onChange={(e) => setPlatformSettings({ ...platformSettings, gstPercentage: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white text-slate-900"
                      />
                      <span className="text-[10px] text-slate-400 block">Split 50/50 as CGST and SGST on invoice</span>
                    </div>
                  </div>
                </div>

                {/* Business Billing Metadata Grid */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    2. Legal Entity &amp; GST Invoice Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 sm:col-span-2">
                      <label className="font-bold text-slate-700 block text-[11px]">
                        Registered Business Name
                      </label>
                      <input
                        type="text"
                        required
                        value={platformSettings.businessName}
                        onChange={(e) => setPlatformSettings({ ...platformSettings, businessName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white text-slate-900"
                      />
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <label className="font-bold text-slate-700 block text-[11px]">
                        GSTIN Number
                      </label>
                      <input
                        type="text"
                        required
                        value={platformSettings.gstin}
                        onChange={(e) => setPlatformSettings({ ...platformSettings, gstin: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold bg-white text-slate-900"
                      />
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <label className="font-bold text-slate-700 block text-[11px]">
                        SAC Code
                      </label>
                      <input
                        type="text"
                        required
                        value={platformSettings.sacCode}
                        onChange={(e) => setPlatformSettings({ ...platformSettings, sacCode: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold bg-white text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Detergent & Packaging Options Section */}
                <div className="space-y-4 pt-2">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    3. Dynamic Detergent &amp; Packaging Options
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Detergents */}
                    <div className="p-4 rounded-2xl border border-slate-200 space-y-3 bg-slate-50/50">
                      <span className="font-bold text-slate-800 block text-xs">Detergent Choices:</span>
                      <div className="space-y-2">
                        {platformSettings.detergentOptions?.map((det, dIdx) => (
                          <div key={dIdx} className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-slate-900">{det.name}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">Code: {det.code} {det.extraPricePerOrder > 0 && `(+₹${det.extraPricePerOrder})`}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setPlatformSettings((prev) => {
                                  const updated = [...(prev.detergentOptions || [])];
                                  updated[dIdx] = { ...updated[dIdx], isActive: !updated[dIdx].isActive };
                                  return { ...prev, detergentOptions: updated };
                                });
                              }}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                                det.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {det.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Packaging */}
                    <div className="p-4 rounded-2xl border border-slate-200 space-y-3 bg-slate-50/50">
                      <span className="font-bold text-slate-800 block text-xs">Packaging Choices:</span>
                      <div className="space-y-2">
                        {platformSettings.packagingOptions?.map((pkg, pIdx) => (
                          <div key={pIdx} className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-slate-900">{pkg.name}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">Code: {pkg.code} {pkg.extraPricePerOrder > 0 && `(+₹${pkg.extraPricePerOrder})`}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setPlatformSettings((prev) => {
                                  const updated = [...(prev.packagingOptions || [])];
                                  updated[pIdx] = { ...updated[pIdx], isActive: !updated[pIdx].isActive };
                                  return { ...prev, packagingOptions: updated };
                                });
                              }}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                                pkg.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {pkg.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-6 py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-md shadow-primary-600/30 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Save Platform Configuration to MongoDB</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Section 2: Dynamic Time Slots Manager */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary-600" />
                  <span>Dynamic Logistics Time Slots &amp; Capacity Control</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Manage operational slots in MongoDB. Customer booking and rider dispatch automatically sync with these capacities.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchAdminSlots}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Slots</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewSlotModal(true)}
                  className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-primary-600/30 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Time Slot</span>
                </button>
              </div>
            </div>

            {loadingSlots ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Loading dynamic time slots from MongoDB...</p>
              </div>
            ) : adminSlots.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No time slots found. Click "Add Time Slot" to create one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Slot Label</th>
                      <th className="py-3 px-4">Operating Hours (24h)</th>
                      <th className="py-3 px-4 text-center">Max Capacity (Orders)</th>
                      <th className="py-3 px-4 text-center">Sort Order</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {adminSlots.map((slot) => (
                      <tr key={slot._id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-bold text-slate-900">{slot.label}</td>
                        <td className="py-3 px-4 text-slate-600 font-mono">
                          {String(slot.startHour).padStart(2, '0')}:00 — {String(slot.endHour).padStart(2, '0')}:00
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            min="1"
                            defaultValue={slot.maxCapacity}
                            onBlur={(e) => {
                              if (Number(e.target.value) !== slot.maxCapacity) {
                                handleUpdateSlotCapacity(slot._id, e.target.value);
                              }
                            }}
                            className="w-16 px-2 py-1 text-center font-bold rounded-lg border border-slate-300 bg-white"
                          />
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-600">{slot.sortOrder}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSlotActive(slot)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                              slot.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {slot.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-[11px] text-slate-400">Auto-saved on blur</span>
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
    </div>
  )}

        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL: ADD TIME SLOT (CMS) */}
      {/* ===================================================================== */}
      {newSlotModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create Dynamic Time Slot</h3>
                <p className="text-xs text-slate-500">Add a new pickup &amp; delivery window</p>
              </div>
              <button
                onClick={() => setNewSlotModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Slot Label *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 04:00 PM - 06:00 PM"
                  value={newSlotForm.label}
                  onChange={(e) => setNewSlotForm({ ...newSlotForm, label: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Hour (24h) *</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    required
                    value={newSlotForm.startHour}
                    onChange={(e) => setNewSlotForm({ ...newSlotForm, startHour: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Hour (24h) *</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    required
                    value={newSlotForm.endHour}
                    onChange={(e) => setNewSlotForm({ ...newSlotForm, endHour: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max Capacity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newSlotForm.maxCapacity}
                    onChange={(e) => setNewSlotForm({ ...newSlotForm, maxCapacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={newSlotForm.sortOrder}
                    onChange={(e) => setNewSlotForm({ ...newSlotForm, sortOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewSlotModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold"
                >
                  Create Slot
                </button>
              </div>
            </form>
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

              {/* Garment Image Upload (Cloudinary) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Garment Photo (Live Cloudinary Media)
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
                    {editingGarment.imageUrl ? (
                      <img src={editingGarment.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="px-3 py-1.5 rounded-xl bg-primary-50 text-primary-700 hover:bg-primary-100 font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 border border-primary-200 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingGarmentImage ? 'Uploading...' : 'Choose Image File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingGarmentImage}
                        onChange={(e) => handleUploadGarmentImage(e.target.files?.[0], true)}
                        className="hidden"
                      />
                    </label>
                    {editingGarment.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setEditingGarment({ ...editingGarment, imageUrl: '', cloudinaryPublicId: '' })}
                        className="block text-[10px] text-rose-600 hover:underline cursor-pointer"
                      >
                        Remove Image
                      </button>
                    )}
                  </div>
                </div>
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

              {/* Garment Image Upload (Cloudinary) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Garment Photo (Live Cloudinary Media)
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
                    {newGarmentForm.imageUrl ? (
                      <img src={newGarmentForm.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="px-3 py-1.5 rounded-xl bg-primary-50 text-primary-700 hover:bg-primary-100 font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 border border-primary-200 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingGarmentImage ? 'Uploading...' : 'Choose Image File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingGarmentImage}
                        onChange={(e) => handleUploadGarmentImage(e.target.files?.[0], false)}
                        className="hidden"
                      />
                    </label>
                    {newGarmentForm.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setNewGarmentForm({ ...newGarmentForm, imageUrl: '', cloudinaryPublicId: '' })}
                        className="block text-[10px] text-rose-600 hover:underline cursor-pointer"
                      >
                        Remove Image
                      </button>
                    )}
                  </div>
                </div>
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
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-slate-500 block font-bold">1. Pickup Rider (Leg 1):</span>
                  <select
                    value={inspectOrder.logistics?.pickupRider?._id || inspectOrder.pickupSchedule?.assignedRider?._id || ''}
                    onChange={(e) => handleAssignRider(inspectOrder._id, e.target.value, 'PICKUP')}
                    className="mt-1 w-full px-2.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50/50 font-bold text-slate-800 text-xs"
                  >
                    <option value="UNASSIGN">No Pickup Rider</option>
                    {riders.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block font-bold">2. Delivery Rider (Leg 2):</span>
                  <select
                    value={inspectOrder.logistics?.deliveryRider?._id || inspectOrder.deliverySchedule?.assignedRider?._id || ''}
                    onChange={(e) => handleAssignRider(inspectOrder._id, e.target.value, 'DELIVERY')}
                    className="mt-1 w-full px-2.5 py-1.5 rounded-xl border border-teal-300 bg-teal-50/50 font-bold text-slate-800 text-xs"
                  >
                    <option value="UNASSIGN">No Delivery Rider</option>
                    {riders.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block font-bold">Physical Bag Tag ID:</span>
                  <div className="mt-1 font-mono font-bold text-slate-800 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
                    {inspectOrder.logistics?.bagTagId || 'Not assigned yet'}
                  </div>
                </div>
              </div>

              {inspectOrder.logistics?.inspectionNotes && (
                <div className="p-2 rounded-xl bg-amber-50 text-amber-900 text-[11px] border border-amber-200">
                  <strong>Pickup Inspection:</strong> {inspectOrder.logistics.inspectionNotes}
                </div>
              )}

              {/* Doorstep Stain Inspection Photos */}
              {inspectOrder.logistics?.inspectionPhotos?.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-800 block text-[11px]">
                    Doorstep Stain &amp; Fabric Inspection Photos ({inspectOrder.logistics.inspectionPhotos.length}):
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {inspectOrder.logistics.inspectionPhotos.map((photo, pIdx) => (
                      <a
                        key={pIdx}
                        href={photo?.url || photo?.imageUrl || photo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block aspect-square rounded-xl overflow-hidden border border-slate-200 group relative hover:opacity-90 transition-opacity bg-slate-100 shadow-xs"
                      >
                        <img
                          src={photo?.url || photo?.imageUrl || photo}
                          alt={`Inspection Photo ${pIdx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute bottom-1 right-1 bg-slate-900/70 text-[9px] text-white px-1.5 py-0.5 rounded font-mono">
                          View
                        </span>
                      </a>
                    ))}
                  </div>
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
          isOpen={Boolean(invoiceOrder)}
          order={invoiceOrder}
          onClose={() => setInvoiceOrder(null)}
        />
      )}

    </div>
  );
};

export default AdminDashboardPage;
