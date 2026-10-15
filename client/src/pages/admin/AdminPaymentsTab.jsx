import React, { useState, useEffect } from 'react';
import { 
  IndianRupee, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  Edit, 
  X, 
  CreditCard, 
  Banknote, 
  QrCode,
  ArrowUpRight,
  ShieldCheck,
  Bike,
  Check
} from 'lucide-react';
import { adminService } from '../../services/api';
import GstInvoiceModal from '../../components/GstInvoiceModal';
import toast from 'react-hot-toast';

const AdminPaymentsTab = () => {
  const [payments, setPayments] = useState([]);
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [reconcileFilter, setReconcileFilter] = useState('ALL');

  // Metrics
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    settledRevenue: 0,
    pendingCodRevenue: 0,
    failedRefundedRevenue: 0,
    pendingCashHandoverRevenue: 0,
    pendingCashHandoverCount: 0,
    pendingUtrVerificationRevenue: 0,
    pendingUtrVerificationCount: 0,
    totalReconciledRevenue: 0
  });

  // Modals
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [reconcileOrder, setReconcileOrder] = useState(null);
  const [reconcileStatus, setReconcileStatus] = useState('PAID');
  const [reconcileAccountingStatus, setReconcileAccountingStatus] = useState('RECONCILED');
  const [reconcileUtr, setReconcileUtr] = useState('');
  const [reconcileNote, setReconcileNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Bulk Rider Cash Handover Modal
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedRiderId, setSelectedRiderId] = useState('');
  const [bulkNote, setBulkNote] = useState('');

  const fetchRiders = async () => {
    try {
      const res = await adminService.getRiders();
      if (res.success) {
        setRiders(res.data || res.riders || []);
      }
    } catch (err) {
      console.error('[Fetch Riders Error]:', err);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (methodFilter !== 'ALL') params.method = methodFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (reconcileFilter !== 'ALL') params.reconciliationStatus = reconcileFilter;

      const res = await adminService.getPayments(params);
      if (res.success) {
        setPayments(res.data || res.transactions || []);
        setMetrics({
          totalRevenue: res.totalRevenue || 0,
          settledRevenue: res.settledRevenue || 0,
          pendingCodRevenue: res.pendingCodRevenue || 0,
          failedRefundedRevenue: res.failedRefundedRevenue || 0,
          pendingCashHandoverRevenue: res.pendingCashHandoverRevenue || 0,
          pendingCashHandoverCount: res.pendingCashHandoverCount || 0,
          pendingUtrVerificationRevenue: res.pendingUtrVerificationRevenue || 0,
          pendingUtrVerificationCount: res.pendingUtrVerificationCount || 0,
          totalReconciledRevenue: res.totalReconciledRevenue || 0
        });
      }
    } catch (err) {
      console.error('[Admin Payments Error]:', err);
      toast.error('Failed to load payments ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchRiders();
  }, [methodFilter, statusFilter, reconcileFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPayments();
  };

  const handleOpenReconcile = (order) => {
    setReconcileOrder(order);
    setReconcileStatus(order.paymentStatus || order.paymentDetails?.status || 'PAID');
    setReconcileAccountingStatus(order.reconciliationStatus || order.paymentDetails?.reconciliationStatus || 'RECONCILED');
    setReconcileUtr(order.paymentDetails?.transactionReferenceId || '');
    setReconcileNote(order.paymentDetails?.reconciliationNotes || '');
  };

  const handleReconcileSubmit = async (e) => {
    e.preventDefault();
    if (!reconcileOrder) return;

    try {
      setActionLoading(true);
      const res = await adminService.updatePaymentStatus(reconcileOrder._id, {
        paymentStatus: reconcileStatus,
        reconciliationStatus: reconcileAccountingStatus,
        transactionReferenceId: reconcileUtr.trim(),
        note: reconcileNote.trim()
      });
      if (res.success) {
        toast.success(res.message || 'Payment status updated!');
        setReconcileOrder(null);
        fetchPayments();
      }
    } catch (err) {
      console.error('[Reconcile Error]:', err);
      toast.error(err.response?.data?.message || 'Failed to update payment status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickReconcile = async (order, targetStatus = 'RECONCILED') => {
    try {
      setActionLoading(true);
      const res = await adminService.updatePaymentStatus(order._id, {
        paymentStatus: 'PAID',
        reconciliationStatus: targetStatus,
        note: `Admin quick-reconciled order to ${targetStatus}`
      });
      if (res.success) {
        toast.success(`Order #${order.orderNumber} successfully reconciled!`);
        fetchPayments();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reconcile payment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkReconcileSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRiderId) {
      toast.error('Please select a rider to reconcile.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await adminService.reconcileRiderCash(selectedRiderId, bulkNote);
      if (res.success) {
        toast.success(res.message || 'Rider cash handover reconciled!');
        setBulkModalOpen(false);
        setSelectedRiderId('');
        setBulkNote('');
        fetchPayments();
      }
    } catch (err) {
      console.error('[Bulk Reconcile Error]:', err);
      toast.error(err.response?.data?.message || 'Failed to reconcile rider cash.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            PAID
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3" />
            PENDING
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
            <XCircle className="w-3 h-3" />
            FAILED
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
            <AlertCircle className="w-3 h-3" />
            REFUNDED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const getReconciliationBadge = (order) => {
    const status = order.reconciliationStatus || order.paymentDetails?.reconciliationStatus;
    switch (status) {
      case 'RECONCILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Reconciled
          </span>
        );
      case 'PENDING_CASH_HANDOVER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
            <Banknote className="w-3 h-3 text-amber-600" />
            Cash Handover Due
          </span>
        );
      case 'PENDING_UTR_VERIFICATION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-300">
            <QrCode className="w-3 h-3 text-teal-600" />
            UTR Verify Due
          </span>
        );
      case 'UNCOLLECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">
            <Clock className="w-3 h-3 text-slate-400" />
            Awaiting Doorstep
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-medium text-slate-400">Prepaid</span>
        );
    }
  };

  const getMethodBadge = (order) => {
    const isCod = order.paymentMethod === 'COD';
    const subMethod = order.paymentDetails?.onlineSubMethod;
    const codMethod = order.paymentDetails?.codCollectionMethod;

    if (isCod) {
      return (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <Banknote className="w-3 h-3" />
              COD
            </span>
            {codMethod === 'COMPANY_QR' ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                Company UPI QR
              </span>
            ) : codMethod === 'CASH' ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                Doorstep Cash
              </span>
            ) : null}
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <CreditCard className="w-3 h-3" />
          Razorpay
        </span>
        {subMethod && (
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 uppercase">
            {subMethod}
          </span>
        )}
      </div>
    );
  };

  // Selected Rider pending cash in bulk modal
  const selectedRiderPendingOrders = payments.filter((p) => {
    const collId = String(p.paymentDetails?.collectedBy?._id || p.paymentDetails?.collectedBy || '');
    return collId === selectedRiderId && (p.reconciliationStatus === 'PENDING_CASH_HANDOVER' || p.paymentDetails?.reconciliationStatus === 'PENDING_CASH_HANDOVER');
  });
  const selectedRiderPendingTotal = selectedRiderPendingOrders.reduce(
    (sum, o) => sum + (o.paymentDetails?.amountCollected || o.pricingBreakdown?.finalPayable || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Gross Pipeline</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">₹{metrics.totalRevenue.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Settled &amp; Paid</p>
            <p className="text-xl font-black text-emerald-700 mt-0.5">₹{metrics.settledRevenue.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-300 shadow-xs flex items-center gap-4 bg-amber-50/30">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Cash Handover Due</p>
            <p className="text-xl font-black text-amber-800 mt-0.5">₹{metrics.pendingCashHandoverRevenue.toLocaleString('en-IN')}</p>
            <span className="text-[10px] text-amber-700">{metrics.pendingCashHandoverCount} order(s)</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-teal-300 shadow-xs flex items-center gap-4 bg-teal-50/30">
          <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">UTR Verify Due</p>
            <p className="text-xl font-black text-teal-800 mt-0.5">₹{metrics.pendingUtrVerificationRevenue.toLocaleString('en-IN')}</p>
            <span className="text-[10px] text-teal-700">{metrics.pendingUtrVerificationCount} order(s)</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Reconciled</p>
            <p className="text-xl font-black text-emerald-800 mt-0.5">₹{metrics.totalReconciledRevenue.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Filter, Search & Bulk Actions Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Order #, Customer, Phone, or UTR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 outline-hidden transition-all"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Method Filter */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            {['ALL', 'COD', 'RAZORPAY'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethodFilter(m)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  methodFilter === m
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                {m === 'ALL' ? 'All Methods' : m}
              </button>
            ))}
          </div>

          {/* Reconciliation Status Filter */}
          <select
            value={reconcileFilter}
            onChange={(e) => setReconcileFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 text-slate-700"
          >
            <option value="ALL">All Reconcile Status</option>
            <option value="PENDING_CASH_HANDOVER">💵 Cash Handover Due</option>
            <option value="PENDING_UTR_VERIFICATION">📱 UTR Verify Due</option>
            <option value="RECONCILED">Verified &amp; Reconciled</option>
            <option value="UNCOLLECTED">Uncollected (In-Transit)</option>
          </select>

          {/* Bulk Rider Cash Handover Button */}
          <button
            type="button"
            onClick={() => setBulkModalOpen(true)}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Banknote className="w-4 h-4" />
            <span>Reconcile Rider Cash</span>
          </button>

          <button
            type="button"
            onClick={fetchPayments}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-primary-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Payments Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary-600 mb-2" />
            <p className="text-sm font-medium">Loading payments ledger &amp; reconciliation data...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center">
            <IndianRupee className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-700">No payment records found</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing search filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Order &amp; Date</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Method &amp; Details</th>
                  <th className="py-3.5 px-4">Collecting Rider</th>
                  <th className="py-3.5 px-4 text-center">Payment Status</th>
                  <th className="py-3.5 px-4 text-center">Reconciliation</th>
                  <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                  <th className="py-3.5 px-4">Reference / UTR</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((order) => {
                  const isCashHandoverPending = order.reconciliationStatus === 'PENDING_CASH_HANDOVER' || order.paymentDetails?.reconciliationStatus === 'PENDING_CASH_HANDOVER';
                  const isUtrPending = order.reconciliationStatus === 'PENDING_UTR_VERIFICATION' || order.paymentDetails?.reconciliationStatus === 'PENDING_UTR_VERIFICATION';
                  const collectingRider = order.paymentDetails?.collectedBy || order.logistics?.deliveryRider || order.logistics?.assignedRider;

                  return (
                    <tr key={order._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Order # and Date */}
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-bold text-slate-900 font-mono">{order.orderNumber}</span>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(order.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">{order.customer?.name || 'Walk-in Guest'}</p>
                        <p className="text-[11px] text-slate-400">{order.customer?.phone || order.pickupAddress?.contactPhone || '—'}</p>
                      </td>

                      {/* Method */}
                      <td className="py-3.5 px-4">
                        {getMethodBadge(order)}
                      </td>

                      {/* Collecting Rider */}
                      <td className="py-3.5 px-4">
                        {collectingRider ? (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Bike className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span className="font-medium">{collectingRider.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>

                      {/* Payment Status */}
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(order.paymentStatus || order.paymentDetails?.status)}
                      </td>

                      {/* Reconciliation Status */}
                      <td className="py-3.5 px-4 text-center">
                        {getReconciliationBadge(order)}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                        ₹{order.pricingBreakdown?.finalPayable || 0}
                      </td>

                      {/* Transaction Reference / 12-digit UTR */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {order.paymentDetails?.transactionReferenceId ? (
                          <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 font-bold border border-teal-200">
                            UTR: {order.paymentDetails.transactionReferenceId}
                          </span>
                        ) : order.paymentDetails?.razorpayPaymentId || order.paymentDetails?.transactionId ? (
                          <span className="text-slate-500">
                            {order.paymentDetails?.razorpayPaymentId || order.paymentDetails?.transactionId}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isCashHandoverPending && (
                            <button
                              type="button"
                              onClick={() => handleQuickReconcile(order, 'RECONCILED')}
                              disabled={actionLoading}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] rounded-lg transition-colors shadow-xs"
                              title="Confirm cash handed over by rider"
                            >
                              Confirm Cash
                            </button>
                          )}

                          {isUtrPending && (
                            <button
                              type="button"
                              onClick={() => handleQuickReconcile(order, 'RECONCILED')}
                              disabled={actionLoading}
                              className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] rounded-lg transition-colors shadow-xs"
                              title="Approve customer UTR payment"
                            >
                              Approve UTR
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenReconcile(order)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-primary-50 hover:text-primary-700 text-slate-700 font-semibold text-[11px] rounded-lg transition-colors"
                            title="Audit / Edit payment and reconciliation status"
                          >
                            Reconcile
                          </button>

                          <button
                            type="button"
                            onClick={() => setInvoiceOrder(order)}
                            className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="View / Download GST Invoice"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* BULK RIDER CASH HANDOVER MODAL */}
      {/* ===================================================================== */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Reconcile Rider Shift Cash</h3>
                  <p className="text-xs text-amber-800">Clear all pending cash orders for a rider</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkReconcileSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select Rider
                </label>
                <select
                  value={selectedRiderId}
                  onChange={(e) => setSelectedRiderId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:ring-2 focus:ring-amber-500"
                  required
                >
                  <option value="">-- Choose Rider --</option>
                  {riders.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} ({r.phone})
                    </option>
                  ))}
                </select>
              </div>

              {selectedRiderId && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900">Pending Orders to Settle:</span>
                    <span className="font-black text-amber-950 text-base">{selectedRiderPendingOrders.length}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-amber-200">
                    <span className="font-bold text-amber-900">Total Cash to Hand Over:</span>
                    <span className="font-black text-amber-950 text-lg">
                      ₹{selectedRiderPendingTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Handover Notes / Hub Register Ref
                </label>
                <textarea
                  rows={2}
                  value={bulkNote}
                  onChange={(e) => setBulkNote(e.target.value)}
                  placeholder="e.g. Received ₹2,450 cash in Hub Register #3 from Rider Ramesh."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !selectedRiderId || selectedRiderPendingOrders.length === 0}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Processing...' : `Confirm & Reconcile (₹${selectedRiderPendingTotal})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* RECONCILE / UPDATE PAYMENT STATUS MODAL */}
      {/* ===================================================================== */}
      {reconcileOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Audit &amp; Reconcile Order</h3>
                  <p className="text-xs text-slate-500">{reconcileOrder.orderNumber} - ₹{reconcileOrder.pricingBreakdown?.finalPayable}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReconcileOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReconcileSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Accounting Reconciliation Status
                </label>
                <select
                  value={reconcileAccountingStatus}
                  onChange={(e) => setReconcileAccountingStatus(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 outline-hidden font-bold"
                >
                  <option value="RECONCILED">RECONCILED (Verified, Cash Deposited or UTR Confirmed)</option>
                  <option value="PENDING_CASH_HANDOVER">PENDING_CASH_HANDOVER (Cash collected by rider, not yet at hub)</option>
                  <option value="PENDING_UTR_VERIFICATION">PENDING_UTR_VERIFICATION (Awaiting bank UTR confirmation)</option>
                  <option value="UNCOLLECTED">UNCOLLECTED (Pending delivery collection)</option>
                  <option value="NOT_APPLICABLE">NOT_APPLICABLE (Prepaid / Online)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Payment Status
                </label>
                <select
                  value={reconcileStatus}
                  onChange={(e) => setReconcileStatus(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 outline-hidden font-bold"
                >
                  <option value="PAID">PAID (Settled)</option>
                  <option value="PENDING">PENDING</option>
                  <option value="REFUNDED">REFUNDED</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  12-Digit Bank UPI Reference / UTR Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 428910928371"
                  value={reconcileUtr}
                  onChange={(e) => setReconcileUtr(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Audit Notes / Internal Log
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Cash ₹520 collected by Rider Ramesh at delivery; reconciled by Admin."
                  value={reconcileNote}
                  onChange={(e) => setReconcileNote(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReconcileOrder(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Updating...' : 'Save & Reconcile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GST Invoice Modal */}
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

export default AdminPaymentsTab;
