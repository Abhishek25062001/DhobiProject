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
  ShieldCheck
} from 'lucide-react';
import { adminService } from '../../services/api';
import GstInvoiceModal from '../../components/GstInvoiceModal';
import toast from 'react-hot-toast';

const AdminPaymentsTab = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Metrics
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    settledRevenue: 0,
    pendingCodRevenue: 0,
    failedRefundedRevenue: 0
  });

  // Modals
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [reconcileOrder, setReconcileOrder] = useState(null);
  const [reconcileStatus, setReconcileStatus] = useState('PAID');
  const [reconcileNote, setReconcileNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (methodFilter !== 'ALL') params.paymentMethod = methodFilter;
      if (statusFilter !== 'ALL') params.paymentStatus = statusFilter;

      const res = await adminService.getPayments(params);
      if (res.success) {
        setPayments(res.data || []);
        setMetrics({
          totalRevenue: res.totalRevenue || 0,
          settledRevenue: res.settledRevenue || 0,
          pendingCodRevenue: res.pendingCodRevenue || 0,
          failedRefundedRevenue: res.failedRefundedRevenue || 0
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
  }, [methodFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPayments();
  };

  const handleOpenReconcile = (order) => {
    setReconcileOrder(order);
    setReconcileStatus(order.paymentStatus || 'PAID');
    setReconcileNote('');
  };

  const handleReconcileSubmit = async (e) => {
    e.preventDefault();
    if (!reconcileOrder) return;

    try {
      setActionLoading(true);
      const res = await adminService.updatePaymentStatus(reconcileOrder._id, {
        paymentStatus: reconcileStatus,
        note: reconcileNote
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

  const getMethodBadge = (order) => {
    const isCod = order.paymentMethod === 'COD';
    const subMethod = order.paymentDetails?.onlineSubMethod;

    if (isCod) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Banknote className="w-3 h-3" />
            COD
          </span>
          {subMethod === 'UPI_QR' && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 border border-teal-200">
              UPI QR at Doorstep
            </span>
          )}
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

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Pipeline</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">₹{metrics.totalRevenue.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Settled & Paid</p>
            <p className="text-2xl font-black text-emerald-700 mt-0.5">₹{metrics.settledRevenue.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending COD</p>
            <p className="text-2xl font-black text-amber-700 mt-0.5">₹{metrics.pendingCodRevenue.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Refunded / Failed</p>
            <p className="text-2xl font-black text-purple-700 mt-0.5">₹{metrics.failedRefundedRevenue.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Order #, Customer, or Payment ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 outline-hidden transition-all"
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

          {/* Status Filter */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            {['ALL', 'PAID', 'PENDING', 'FAILED', 'REFUNDED'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  statusFilter === s
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                {s === 'ALL' ? 'All Status' : s}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchPayments}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-primary-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
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
            <p className="text-sm font-medium">Loading payments ledger...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center">
            <IndianRupee className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-700">No payment records found</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing search filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Order & Date</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Method</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                  <th className="py-3.5 px-4">Transaction Reference</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((order) => (
                  <tr key={order._id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Order # and Date */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-slate-900">{order.orderNumber}</span>
                        <p className="text-xs text-slate-400 mt-0.5">
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
                      <p className="font-bold text-slate-800 text-xs">{order.customer?.name || 'Walk-in Guest'}</p>
                      <p className="text-[11px] text-slate-400">{order.customer?.phone || order.pickupAddress?.contactPhone || '—'}</p>
                    </td>

                    {/* Method */}
                    <td className="py-3.5 px-4">
                      {getMethodBadge(order)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(order.paymentStatus)}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right font-black text-slate-900">
                      ₹{order.pricingBreakdown?.finalPayable || 0}
                    </td>

                    {/* Transaction Reference */}
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                      {order.paymentDetails?.razorpayPaymentId || order.paymentDetails?.transactionId || '—'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenReconcile(order)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-primary-50 hover:text-primary-700 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
                          title="Reconcile or change payment status"
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                  <h3 className="font-bold text-slate-900">Reconcile Payment</h3>
                  <p className="text-xs text-slate-500">{reconcileOrder.orderNumber} - ₹{reconcileOrder.pricingBreakdown?.finalPayable}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReconcileOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReconcileSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Payment Status
                </label>
                <select
                  value={reconcileStatus}
                  onChange={(e) => setReconcileStatus(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 outline-hidden font-bold"
                >
                  <option value="PAID">PAID (Cash Handed Over / Settled)</option>
                  <option value="PENDING">PENDING (Awaiting Cash or Online Settlement)</option>
                  <option value="REFUNDED">REFUNDED (Reversed to Customer)</option>
                  <option value="FAILED">FAILED (Transaction Unsuccessful)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Audit Notes / Reference (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Cash ₹520 collected by Rider Ramesh at delivery; reconciled by Admin."
                  value={reconcileNote}
                  onChange={(e) => setReconcileNote(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReconcileOrder(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-xl shadow-xs disabled:opacity-50"
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
          order={invoiceOrder}
          onClose={() => setInvoiceOrder(null)}
        />
      )}
    </div>
  );
};

export default AdminPaymentsTab;
