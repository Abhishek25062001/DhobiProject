import { orderStage, orderStatusLabel } from '../../../shared/orderStages.mjs';
import React, { useState, useEffect, useRef } from 'react';
import { orderService, configService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Bike,
  Package,
  Clock,
  MapPin,
  Phone,
  CheckCircle2,
  AlertCircle,
  Truck,
  Sparkles,
  RefreshCw,
  Search,
  Tag,
  FileText,
  DollarSign,
  ShieldCheck,
  KeyRound,
  X,
  Loader2,
  QrCode,
  Banknote,
  Camera,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

const RiderDashboardPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pickups'); // 'pickups', 'in_plant', 'deliveries', 'all'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [pickupModalOrder, setPickupModalOrder] = useState(null);
  const [deliveryModalOrder, setDeliveryModalOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const pickupBodyRef = useRef(null);
  const deliveryBodyRef = useRef(null);

  // Form states for pickup modal
  const [pickupOtp, setPickupOtp] = useState('');
  const [bagTagId, setBagTagId] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [verifiedGarmentCount, setVerifiedGarmentCount] = useState('');
  const [stainPhotos, setStainPhotos] = useState([]);
  const [uploadingStainPhoto, setUploadingStainPhoto] = useState(false);

  // Form states for delivery modal
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [codCollectionMethod, setCodCollectionMethod] = useState('CASH'); // 'CASH' or 'COMPANY_QR'
  const [utrNumber, setUtrNumber] = useState('');

  // Rider Shift Cash & Accounting Metrics
  const [riderStats, setRiderStats] = useState({
    cashInHand: 0,
    pendingHandoversCount: 0,
    companyQrPaymentsCount: 0
  });

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await orderService.getRiderTasks();
      if (res.success) {
        setTasks(res.tasks || []);
        setRiderStats({
          cashInHand: res.cashInHand || 0,
          pendingHandoversCount: res.pendingHandoversCount || 0,
          companyQrPaymentsCount: res.companyQrPaymentsCount || 0
        });
      }
    } catch (err) {
      console.error('[Rider Tasks Error]:', err);
      toast.error('Failed to load rider delivery tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Filter tasks by active tab
  const filteredTasks = tasks.filter((task) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNum = task.orderNumber?.toLowerCase().includes(q);
      const matchCust = task.customer?.name?.toLowerCase().includes(q);
      const matchPhone = task.pickupAddress?.contactPhone?.includes(q);
      if (!matchNum && !matchCust && !matchPhone) return false;
    }

    if (activeTab === 'pickups') {
      return ['ORDER_PLACED', 'CONFIRMED', 'PICKUP_SCHEDULED', 'OUT_FOR_PICKUP'].includes(orderStage(task.orderStatus)?.id) || task.currentRiderLeg === 'PICKUP';
    }
    if (activeTab === 'in_plant') {
      return ['PICKED_UP', 'IN_WASH', 'IN_IRONING'].includes(orderStage(task.orderStatus)?.id);
    }
    if (activeTab === 'deliveries') {
      return ['READY', 'OUT_FOR_DELIVERY'].includes(orderStage(task.orderStatus)?.id) || (task.currentRiderLeg === 'DELIVERY' && task.orderStatus !== 'DELIVERED');
    }
    if (activeTab === 'completed') {
      return task.orderStatus === 'DELIVERED';
    }
    return true;
  });

  // Aggregates
  const pickupCount = tasks.filter((t) => ['ORDER_PLACED', 'CONFIRMED', 'PICKUP_SCHEDULED', 'OUT_FOR_PICKUP'].includes(orderStage(t.orderStatus)?.id)).length;
  const inPlantCount = tasks.filter((t) => ['PICKED_UP', 'IN_WASH', 'IN_IRONING'].includes(orderStage(t.orderStatus)?.id)).length;
  const deliveryCount = tasks.filter((t) => ['READY', 'OUT_FOR_DELIVERY'].includes(orderStage(t.orderStatus)?.id)).length;
  const deliveredCount = tasks.filter((t) => t.orderStatus === 'DELIVERED').length;

  // Open Pickup Modal
  const openPickupModal = (order) => {
    const totalCount = order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
    setPickupModalOrder(order);
    setPickupOtp('');
    setBagTagId(`BAG-${order.orderNumber.replace('IDB-', '').slice(-6)}`);
    setInspectionNotes('');
    setVerifiedGarmentCount(totalCount.toString());
    setStainPhotos([]);
    setModalError('');
  };

  // Upload stain/inspection photo to Cloudinary
  const handleStainPhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingStainPhoto(true);
    try {
      for (const file of files) {
        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        const base64 = await base64Promise;
        const uploadRes = await configService.uploadImage(base64, 'indodhobi/inspections');
        const photoUrl = uploadRes.url || uploadRes.imageUrl;
        if (uploadRes.success && photoUrl) {
          setStainPhotos((prev) => [...prev, { url: photoUrl, imageUrl: photoUrl, publicId: uploadRes.publicId || '' }]);
        }
      }
      toast.success('Inspection photo(s) uploaded successfully!');
    } catch (err) {
      toast.error('Failed to upload inspection photo. Please try again.');
    } finally {
      setUploadingStainPhoto(false);
      e.target.value = '';
    }
  };

  const handleRemoveStainPhoto = (index) => {
    setStainPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Accept Order for Pickup
  const handleAcceptOrder = async (orderId) => {
    setActionLoading(true);
    try {
      const res = await orderService.updateOrderStatus(orderId, {
        orderStatus: 'PICKUP_ASSIGNED',
        note: 'Order accepted for doorstep pickup by rider'
      });
      if (res.success) {
        toast.success('Order accepted for pickup!');
        fetchTasks();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept order.');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Pickup Verification
  const handleVerifyPickup = async (e) => {
    e.preventDefault();
    setModalError('');
    const cleanOtp = String(pickupOtp).trim();
    if (!cleanOtp || cleanOtp.length !== 4) {
      const err = 'Please enter the 4-digit Pickup OTP provided by the customer.';
      setModalError(err);
      toast.error(err);
      pickupBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!bagTagId.trim()) {
      const err = 'Please assign a physical Bag Tag ID (e.g. BAG-101).';
      setModalError(err);
      toast.error(err);
      return;
    }

    setActionLoading(true);
    try {
      const res = await orderService.verifyPickup(pickupModalOrder._id, {
        otp: cleanOtp,
        pickupOtp: cleanOtp,
        bagTagId: bagTagId.trim(),
        verifiedGarmentCount: Number(verifiedGarmentCount) || 0,
        inspectionNotes: inspectionNotes.trim(),
        inspectionPhotos: stainPhotos
      });

      if (res.success) {
        toast.success(`Order ${pickupModalOrder.orderNumber} successfully picked up!`);
        setPickupModalOrder(null);
        setModalError('');
        fetchTasks();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Pickup verification failed.';
      setModalError(msg);
      toast.error(msg);
      pickupBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setActionLoading(false);
    }
  };

  // Accept/Claim Order or Leg Task
  const handleAcceptTask = async (orderId) => {
    setActionLoading(true);
    try {
      const res = await orderService.acceptTask(orderId);
      if (res.success) {
        toast.success(res.message || 'Task accepted successfully!');
        fetchTasks();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept task.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Delivery Modal
  const openDeliveryModal = (order) => {
    setDeliveryModalOrder(order);
    setDeliveryOtp('');
    setCodCollectionMethod('CASH');
    setUtrNumber('');
    setModalError('');
  };

  // Submit Delivery Verification
  const handleVerifyDelivery = async (e) => {
    e.preventDefault();
    setModalError('');
    const cleanOtp = String(deliveryOtp).trim();
    if (!cleanOtp || cleanOtp.length !== 4) {
      const err = 'Please enter the 4-digit Delivery OTP provided by the customer.';
      setModalError(err);
      toast.error(err);
      deliveryBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const isCodUnpaid = deliveryModalOrder.payment?.method === 'COD' && deliveryModalOrder.payment?.status !== 'PAID';
    if (isCodUnpaid && (codCollectionMethod === 'COMPANY_QR' || codCollectionMethod === 'UPI_QR')) {
      const cleanUtr = String(utrNumber).trim();
      if (!cleanUtr || cleanUtr.length < 8) {
        const err = 'Please enter the valid 12-digit UPI Reference / UTR Number from customer payment receipt.';
        setModalError(err);
        toast.error(err);
        return;
      }
    }

    setActionLoading(true);
    try {
      const payload = {
        otp: cleanOtp,
        deliveryOtp: cleanOtp
      };
      if (isCodUnpaid) {
        payload.codCollectionMethod = codCollectionMethod;
        if (codCollectionMethod === 'COMPANY_QR' || codCollectionMethod === 'UPI_QR') {
          payload.transactionReferenceId = String(utrNumber).trim();
        }
      }

      const res = await orderService.verifyDelivery(deliveryModalOrder._id, payload);

      if (res.success) {
        toast.success(`Order ${deliveryModalOrder.orderNumber} delivered and payment confirmed!`);
        setDeliveryModalOrder(null);
        setUtrNumber('');
        setModalError('');
        fetchTasks();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Delivery verification failed.';
      setModalError(msg);
      toast.error(msg);
      deliveryBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setActionLoading(false);
    }
  };

  // Mark Order as Out for Delivery
  const handleMarkOutForDelivery = async (orderId) => {
    setActionLoading(true);
    try {
      const res = await orderService.updateOrderStatus(orderId, {
        orderStatus: 'OUT_FOR_DELIVERY',
        note: `Dispatched from plant hub by rider ${user?.name || ''}`
      });
      if (res.success) {
        toast.success('Order marked as Out for Delivery!');
        fetchTasks();
      }
    } catch (err) {
      toast.error('Failed to update status to Out for Delivery.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
              <Bike className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Rider Logistics &amp; Doorstep Fleet
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Logged in as <span className="font-bold text-slate-800">{user?.name}</span> ({user?.phone || 'Fleet Rider'}) • Central Processing Hub #3
          </p>
        </div>

        <button
          onClick={fetchTasks}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Tasks</span>
        </button>
      </div>

      {/* Shift Cash Handover Warning Banner */}
      {riderStats.cashInHand > 0 && (
        <div className="mb-8 p-4 rounded-2xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold shrink-0">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Active Shift Cash In Hand</h4>
              <p className="text-xs text-amber-900 mt-0.5">
                You have collected <strong>₹{riderStats.cashInHand.toLocaleString('en-IN')}</strong> in cash across {riderStats.pendingHandoversCount} delivered order(s). Please surrender this cash to the Laundry Hub Manager before clocking out.
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="px-3.5 py-1.5 rounded-xl bg-amber-200 text-amber-900 font-black text-xs border border-amber-300">
              ₹{riderStats.cashInHand.toLocaleString('en-IN')} Pending Handover
            </span>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div
          onClick={() => setActiveTab('pickups')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            activeTab === 'pickups'
              ? 'bg-amber-500/10 border-amber-400 ring-2 ring-amber-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pickups Pending</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{pickupCount}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Awaiting doorstep pickup &amp; bag tagging</p>
        </div>

        <div
          onClick={() => setActiveTab('in_plant')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            activeTab === 'in_plant'
              ? 'bg-primary-500/10 border-primary-400 ring-2 ring-primary-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary-700 uppercase tracking-wider">In-Plant Hub</span>
            <Sparkles className="w-4 h-4 text-primary-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{inPlantCount}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Washing, steam press, &amp; quality inspect</p>
        </div>

        <div
          onClick={() => setActiveTab('deliveries')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            activeTab === 'deliveries'
              ? 'bg-teal-500/10 border-teal-400 ring-2 ring-teal-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Out for Delivery</span>
            <Truck className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{deliveryCount}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Ready for doorstep OTP handover</p>
        </div>

        <div
          className={`p-5 rounded-2xl border transition-all ${
            riderStats.cashInHand > 0
              ? 'bg-amber-500/10 border-amber-300'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Shift Cash In Hand</span>
            <Banknote className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            ₹{riderStats.cashInHand.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {riderStats.pendingHandoversCount} order(s) pending hub handover
          </p>
        </div>
      </div>

      {/* Navigation Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('pickups')}
            className={`px-4 py-2 rounded-xl transition-all shrink-0 ${
              activeTab === 'pickups'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pickups ({pickupCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('in_plant')}
            className={`px-4 py-2 rounded-xl transition-all shrink-0 ${
              activeTab === 'in_plant'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            In-Plant ({inPlantCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('deliveries')}
            className={`px-4 py-2 rounded-xl transition-all shrink-0 ${
              activeTab === 'deliveries'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Deliveries ({deliveryCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 rounded-xl transition-all shrink-0 ${
              activeTab === 'completed'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed ({deliveredCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl transition-all shrink-0 ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({tasks.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order #, customer, phone..."
            className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium"
          />
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Fetching logistics assignment tasks...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
            <Package className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Tasks in this Category</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All caught up! Check back when new pickups are scheduled or orders are dispatched from the wash plant.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTasks.map((task) => {
            const isPickup = ['ORDER_PLACED', 'CONFIRMED', 'PICKUP_SCHEDULED', 'OUT_FOR_PICKUP'].includes(orderStage(task.orderStatus)?.id);
            const isInPlant = ['PICKED_UP', 'IN_WASH', 'IN_IRONING'].includes(orderStage(task.orderStatus)?.id);
            const isReadyForDelivery = orderStage(task.orderStatus)?.id === 'READY';
            const isDelivery = task.orderStatus === 'OUT_FOR_DELIVERY';
            const isDelivered = task.orderStatus === 'DELIVERED';
            const totalGarments = task.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

            const isPickupLeg = task.currentRiderLeg === 'PICKUP';
            const isDeliveryLeg = task.currentRiderLeg === 'DELIVERY';

            return (
              <div
                key={task._id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-6 flex flex-col justify-between space-y-5"
              >
                {/* Top: Order #, Leg Tag & Status Badge */}
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-extrabold text-sm sm:text-base text-slate-900 font-mono">
                        {task.orderNumber}
                      </span>
                      
                      {/* Two-Leg Indicator Tag */}
                      {isPickupLeg && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                          Pickup Leg
                        </span>
                      )}
                      {isDeliveryLeg && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-teal-50 text-teal-800 border border-teal-200">
                          Delivery Leg
                        </span>
                      )}

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        isDelivered
                          ? 'bg-emerald-100 text-emerald-800'
                          : isDelivery
                          ? 'bg-teal-100 text-teal-800 animate-pulse'
                          : isPickup
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-primary-100 text-primary-800'
                      }`}>
                        {orderStatusLabel(task.orderStatus)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-slate-900 text-sm">₹{task.pricingBreakdown?.grandTotal}</span>
                      <span className={`block text-[10px] font-bold ${
                        task.payment?.status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {task.payment?.status === 'PAID' ? 'PAID' : `${task.payment?.method} - COLLECT`}
                      </span>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{task.customer?.name}</span>
                      <a
                        href={`tel:${task.pickupAddress?.contactPhone}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 font-bold text-[11px] border border-teal-200 transition-colors"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{task.pickupAddress?.contactPhone}</span>
                      </a>
                    </div>

                    <div className="flex items-start gap-2 text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <p className="line-clamp-2">
                        {task.pickupAddress?.flatAndBuilding}, {task.pickupAddress?.streetAndLandmark}, {task.pickupAddress?.city} - {task.pickupAddress?.pincode}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {isPickup ? `Pickup: ${task.pickupSchedule?.date} (${task.pickupSchedule?.timeSlot})` : `Delivery: ${task.deliverySchedule?.date} (${task.deliverySchedule?.timeSlot})`}
                      </span>
                    </div>

                    {/* Assigned Leg Fleet Info */}
                    <div className="pt-1.5 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 font-medium">
                      <span>Pickup Rider: <strong className="text-slate-700">{task.logistics?.pickupRider?.name || 'Unassigned'}</strong></span>
                      <span>Delivery Rider: <strong className="text-slate-700">{task.logistics?.deliveryRider?.name || 'Unassigned'}</strong></span>
                    </div>
                  </div>

                  {/* Garment Summary & Bag Tag */}
                  <div className="mt-3.5 flex items-center justify-between text-xs px-1">
                    <span className="text-slate-500 font-medium">
                      Garments: <strong className="text-slate-800">{totalGarments} items</strong>
                      {task.logistics?.verifiedGarmentCount > 0 && ` (Verified: ${task.logistics.verifiedGarmentCount})`}
                    </span>

                    {task.logistics?.bagTagId ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-mono font-bold text-[11px] border border-slate-200">
                        <Tag className="w-3 h-3 text-teal-600" />
                        <span>{task.logistics.bagTagId}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">No Bag Tag Assigned Yet</span>
                    )}
                  </div>

                  {task.logistics?.inspectionNotes && (
                    <div className="mt-2 text-[11px] p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                      <strong>Notes:</strong> {task.logistics.inspectionNotes}
                    </div>
                  )}
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* Pickup Claim or Verification */}
                  {task.orderStatus === 'BOOKED' && (
                    <button
                      type="button"
                      onClick={() => handleAcceptTask(task._id)}
                      disabled={actionLoading}
                      className="w-full lg:w-auto py-2.5 px-4 rounded-xl font-bold text-xs bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Accept Pickup Task</span>
                    </button>
                  )}

                  {isPickup && task.orderStatus !== 'BOOKED' && (
                    <button
                      type="button"
                      onClick={() => openPickupModal(task)}
                      className="w-full lg:w-auto py-2.5 px-4 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>Verify Pickup &amp; Bag Tag</span>
                    </button>
                  )}

                  {/* Plant Processing */}
                  {isInPlant && (
                    <button
                      type="button"
                      onClick={() => handleMarkOutForDelivery(task._id)}
                      disabled={actionLoading}
                      className="w-full lg:w-auto py-2.5 px-4 rounded-xl font-bold text-xs bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Mark Out for Delivery</span>
                    </button>
                  )}

                  {/* Ready for Delivery Claim */}
                  {isReadyForDelivery && (
                    <button
                      type="button"
                      onClick={() => handleAcceptTask(task._id)}
                      disabled={actionLoading}
                      className="w-full lg:w-auto py-2.5 px-4 rounded-xl font-bold text-xs bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Accept Delivery Task</span>
                    </button>
                  )}

                  {/* Out For Delivery Handover */}
                  {isDelivery && (
                    <button
                      type="button"
                      onClick={() => openDeliveryModal(task)}
                      className="w-full lg:w-auto py-2.5 px-4 rounded-xl font-bold text-xs bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify Delivery &amp; Collect Payment</span>
                    </button>
                  )}

                  {isDelivered && (
                    <div className="w-full lg:w-auto py-2 px-3 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-200 shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Delivered Successfully {task.payment?.codCollectionMethod === 'COMPANY_QR' ? '(UPI QR)' : task.payment?.codCollectionMethod === 'CASH' ? '(Cash)' : ''}</span>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: VERIFY DOORSTEP PICKUP */}
      {pickupModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in duration-200">
            {/* Header (shrink-0) */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Doorstep Pickup Verification
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 mt-0.5">
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                      {pickupModalOrder.orderNumber}
                    </span>
                    {(pickupModalOrder.customer?.name || pickupModalOrder.pickupAddress?.contactPhone) && (
                      <span className="font-medium text-slate-500">
                        • {pickupModalOrder.customer?.name || 'Customer'}
                        {pickupModalOrder.pickupAddress?.contactPhone && ` (${pickupModalOrder.pickupAddress.contactPhone})`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPickupModalOrder(null);
                  setModalError('');
                }}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body (flex-1 overflow-y-auto px-5 py-4 space-y-4) */}
            <form id="pickup-form" ref={pickupBodyRef} onSubmit={handleVerifyPickup} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-xs">
              
              {/* Inline Error Alert Banner */}
              {modalError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-rose-900">Verification Error</p>
                    <p className="text-xs mt-0.5 leading-relaxed">{modalError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalError('')}
                    className="text-rose-400 hover:text-rose-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Pickup OTP */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5">
                <label className="font-bold text-amber-950 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <span>4-Digit Customer Pickup OTP</span>
                    <span className="text-rose-600">*</span>
                  </span>
                  <span className="text-[11px] font-normal text-amber-800">Ask customer at door</span>
                </label>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Enter the 4-digit code displayed under order <strong className="font-mono">{pickupModalOrder.orderNumber}</strong> on customer's screen.
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  required
                  value={pickupOtp}
                  onChange={(e) => {
                    setModalError('');
                    setPickupOtp(e.target.value.replace(/\D/g, ''));
                  }}
                  placeholder="e.g. 9876"
                  className="w-full mt-2 text-center text-2xl font-mono tracking-widest font-black py-2.5 rounded-xl border border-amber-300 bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 shadow-xs"
                />
              </div>

              {/* Physical Bag Tag */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Physical Bag Tag ID <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={bagTagId}
                  onChange={(e) => {
                    setModalError('');
                    setBagTagId(e.target.value);
                  }}
                  placeholder="e.g. BAG-DEL-101"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Verified Garment Count */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Verified Garment Count
                </label>
                <input
                  type="number"
                  min={1}
                  value={verifiedGarmentCount}
                  onChange={(e) => {
                    setModalError('');
                    setVerifiedGarmentCount(e.target.value);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Inspection Notes */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Pre-Existing Fabric Inspection Notes
                </label>
                <textarea
                  rows={2}
                  value={inspectionNotes}
                  onChange={(e) => {
                    setModalError('');
                    setInspectionNotes(e.target.value);
                  }}
                  placeholder="e.g. Missing cuff button on blue shirt; faint grease spot on jeans."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Stain & Inspection Photos (Cloudinary Media Pipeline) */}
              <div className="space-y-2 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-primary-600" />
                    <span>Doorstep Stain Photos (Cloudinary)</span>
                  </label>
                  <label className="px-2.5 py-1 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-bold text-[11px] cursor-pointer inline-flex items-center gap-1 transition-colors">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{uploadingStainPhoto ? 'Uploading...' : '+ Add Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={uploadingStainPhoto}
                      onChange={handleStainPhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-[10px] text-slate-500">
                  Photograph stains, torn hems, or tears before sealing in the bag.
                </p>

                {uploadingStainPhoto && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 text-slate-600">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-600" />
                    <span className="text-[11px]">Uploading photo to Cloudinary CDN...</span>
                  </div>
                )}

                {stainPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {stainPhotos.map((photo, pIdx) => (
                      <div key={pIdx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group bg-white shadow-xs">
                        <img src={photo?.url || photo?.imageUrl || photo} alt={`Stain ${pIdx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveStainPhoto(pIdx)}
                          className="absolute top-1 right-1 p-1 rounded-md bg-rose-600 text-white shadow-xs hover:bg-rose-700 transition-colors cursor-pointer"
                          title="Remove photo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>

            {/* Footer (shrink-0) */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setPickupModalOrder(null);
                  setModalError('');
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="pickup-form"
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Verify &amp; Seal Laundry Bag</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: VERIFY DOORSTEP DELIVERY */}
      {deliveryModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in duration-200">
            {/* Header (shrink-0) */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-100 text-teal-700">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Doorstep Delivery Verification
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 mt-0.5">
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                      {deliveryModalOrder.orderNumber}
                    </span>
                    {(deliveryModalOrder.customer?.name || deliveryModalOrder.pickupAddress?.contactPhone) && (
                      <span className="font-medium text-slate-500">
                        • {deliveryModalOrder.customer?.name || 'Customer'}
                        {deliveryModalOrder.pickupAddress?.contactPhone && ` (${deliveryModalOrder.pickupAddress.contactPhone})`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeliveryModalOrder(null);
                  setModalError('');
                }}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body (flex-1 overflow-y-auto px-5 py-4 space-y-4) */}
            <form id="delivery-form" ref={deliveryBodyRef} onSubmit={handleVerifyDelivery} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-xs">
              
              {/* Inline Error Alert Banner */}
              {modalError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-rose-900">Verification Error</p>
                    <p className="text-xs mt-0.5 leading-relaxed">{modalError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalError('')}
                    className="text-rose-400 hover:text-rose-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Delivery OTP */}
              <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 space-y-1.5">
                <label className="font-bold text-teal-950 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-teal-600" />
                    <span>4-Digit Customer Delivery OTP</span>
                    <span className="text-rose-600">*</span>
                  </span>
                  <span className="text-[11px] font-normal text-teal-800">Ask customer at door</span>
                </label>
                <p className="text-[11px] text-teal-800 leading-relaxed">
                  Ask customer for their 4-digit delivery confirmation code shown under order <strong className="font-mono">{deliveryModalOrder.orderNumber}</strong> after they inspect their clothes.
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  required
                  value={deliveryOtp}
                  onChange={(e) => {
                    setModalError('');
                    setDeliveryOtp(e.target.value.replace(/\D/g, ''));
                  }}
                  placeholder="e.g. 7391"
                  className="w-full mt-2 text-center text-2xl font-mono tracking-widest font-black py-2.5 rounded-xl border border-teal-300 bg-white text-slate-900 focus:ring-2 focus:ring-teal-500 shadow-xs"
                />
              </div>

              {/* COD Payment Collection if Unpaid */}
              {deliveryModalOrder.payment?.method === 'COD' && deliveryModalOrder.payment?.status !== 'PAID' && (
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-950 text-xs">Payment Collection Required:</span>
                    <span className="font-black text-amber-950 text-base">
                      ₹{deliveryModalOrder.pricingBreakdown?.grandTotal}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setModalError('');
                        setCodCollectionMethod('CASH');
                      }}
                      className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        codCollectionMethod === 'CASH'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100/50'
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      <span>Cash Collection</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setModalError('');
                        setCodCollectionMethod('COMPANY_QR');
                      }}
                      className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        codCollectionMethod === 'COMPANY_QR' || codCollectionMethod === 'UPI_QR'
                          ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                          : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100/50'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Company UPI QR</span>
                    </button>
                  </div>

                  {codCollectionMethod === 'CASH' ? (
                    <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-1 text-slate-700">
                      <p className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                        <Banknote className="w-4 h-4 text-amber-600" />
                        <span>Collect exact cash: ₹{deliveryModalOrder.pricingBreakdown?.grandTotal}</span>
                      </p>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Collected cash will be added to your active shift Cash-in-Hand balance. You must surrender this amount to the Hub Manager at shift end.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-white rounded-xl border border-teal-200 space-y-3">
                      <div className="text-center space-y-0.5">
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                          Official Merchant UPI QR
                        </span>
                        <p className="text-xs font-bold text-slate-900 mt-1">IndoDhobi Laundry Pvt Ltd</p>
                        <p className="text-[11px] font-mono text-slate-500">indodhobi.official@icici</p>
                      </div>

                      {/* Dynamic NPCI UPI QR */}
                      <div className="flex flex-col items-center justify-center p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                            `upi://pay?pa=indodhobi.official@icici&pn=IndoDhobi%20Laundry%20Pvt%20Ltd&am=${deliveryModalOrder.pricingBreakdown?.grandTotal || 0}&cu=INR&tn=Order%20${deliveryModalOrder.orderNumber}`
                          )}`}
                          alt="Official IndoDhobi Dynamic UPI QR"
                          className="w-40 h-40 rounded-lg shadow-xs bg-white p-1.5 border border-slate-200"
                        />
                        <p className="text-[10px] text-slate-500 font-medium mt-1.5 text-center">
                          Scan with GPay, PhonePe, Paytm, or BHIM for ₹{deliveryModalOrder.pricingBreakdown?.grandTotal}
                        </p>
                      </div>

                      {/* 12-Digit UTR Input */}
                      <div>
                        <label className="font-bold text-slate-800 block mb-1">
                          12-Digit Bank UPI Reference / UTR Number <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={16}
                          required
                          value={utrNumber}
                          onChange={(e) => {
                            setModalError('');
                            setUtrNumber(e.target.value.replace(/\s+/g, ''));
                          }}
                          placeholder="e.g. 428910928371"
                          className="w-full px-3 py-2 rounded-xl border border-teal-300 font-mono font-bold text-slate-900 bg-teal-50/30 focus:ring-2 focus:ring-teal-500 text-xs tracking-wider"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">
                          Ask customer for the 12-digit UTR/UPI reference code shown on their payment successful receipt.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </form>

            {/* Footer (shrink-0) */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setDeliveryModalOrder(null);
                  setModalError('');
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="delivery-form"
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Verify Delivery &amp; Confirm Handover</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default RiderDashboardPage;
