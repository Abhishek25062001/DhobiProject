import React, { useState, useEffect } from 'react';
import { 
  Bike, 
  Plus, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Edit, 
  Trash2, 
  ListChecks, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  X, 
  AlertCircle,
  Truck,
  Package
} from 'lucide-react';
import { adminService } from '../../services/api';
import toast from 'react-hot-toast';

const VEHICLE_OPTIONS = ['Bike', 'Scooter', 'EV Van', 'Cycle'];
const ZONE_OPTIONS = [
  'All Zones',
  'South Delhi',
  'Central Delhi',
  'North Delhi',
  'West Delhi',
  'East Delhi',
  'Noida',
  'Gurugram'
];

const AdminRidersTab = () => {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedRider, setSelectedRider] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Add Form State
  const [addForm, setAddForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    vehicleType: 'Bike',
    vehicleNumber: '',
    assignedZone: 'All Zones'
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    vehicleType: 'Bike',
    vehicleNumber: '',
    assignedZone: 'All Zones',
    newPassword: ''
  });

  const fetchRiders = async () => {
    try {
      setLoading(true);
      const res = await adminService.getRiders();
      if (res.success) {
        setRiders(res.data || []);
      }
    } catch (err) {
      console.error('[Admin Riders Error]:', err);
      toast.error('Failed to load rider fleet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiders();
  }, []);

  const handleCreateRider = async (e) => {
    e.preventDefault();
    if (!addForm.name || !addForm.phone || !addForm.email || !addForm.password) {
      toast.error('Please fill in all required fields (Name, Phone, Email, Password).');
      return;
    }

    try {
      setActionLoading(true);
      const res = await adminService.createRider(addForm);
      if (res.success) {
        toast.success(res.message || 'Rider created successfully!');
        setShowAddModal(false);
        setAddForm({
          name: '',
          phone: '',
          email: '',
          password: '',
          vehicleType: 'Bike',
          vehicleNumber: '',
          assignedZone: 'All Zones'
        });
        fetchRiders();
      }
    } catch (err) {
      console.error('[Create Rider Error]:', err);
      toast.error(err.response?.data?.message || 'Failed to create rider.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEdit = (rider) => {
    setSelectedRider(rider);
    setEditForm({
      name: rider.name || '',
      phone: rider.phone || '',
      email: rider.email || '',
      vehicleType: rider.riderDetails?.vehicleType || 'Bike',
      vehicleNumber: rider.riderDetails?.vehicleNumber || '',
      assignedZone: rider.riderDetails?.assignedZone || 'All Zones',
      newPassword: ''
    });
    setShowEditModal(true);
  };

  const handleUpdateRider = async (e) => {
    e.preventDefault();
    if (!selectedRider) return;

    try {
      setActionLoading(true);
      const res = await adminService.updateRider(selectedRider._id, editForm);
      if (res.success) {
        toast.success(res.message || 'Rider updated successfully!');
        setShowEditModal(false);
        fetchRiders();
      }
    } catch (err) {
      console.error('[Update Rider Error]:', err);
      toast.error(err.response?.data?.message || 'Failed to update rider.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (riderId) => {
    try {
      const res = await adminService.toggleRiderStatus(riderId);
      if (res.success) {
        toast.success(res.message);
        setRiders((prev) =>
          prev.map((r) => (r._id === riderId ? { ...r, isActive: res.isActive } : r))
        );
      }
    } catch (err) {
      console.error('[Toggle Status Error]:', err);
      toast.error(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedRider) return;
    try {
      setActionLoading(true);
      const res = await adminService.deleteRider(selectedRider._id);
      if (res.success) {
        toast.success(res.message);
        setShowDeleteModal(false);
        fetchRiders();
      }
    } catch (err) {
      console.error('[Delete Rider Error]:', err);
      toast.error(err.response?.data?.message || 'Failed to delete/decommission rider.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRiders = riders.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchName = r.name?.toLowerCase().includes(q);
    const matchPhone = r.phone?.includes(q);
    const matchEmail = r.email?.toLowerCase().includes(q);
    const matchZone = r.riderDetails?.assignedZone?.toLowerCase().includes(q);
    return matchName || matchPhone || matchEmail || matchZone;
  });

  const totalRiders = riders.length;
  const activeRiders = riders.filter((r) => r.isActive).length;
  const totalActiveTasks = riders.reduce((acc, r) => acc + (r.activeAssignedOrders || 0), 0);
  const totalCompletedDeliveries = riders.reduce((acc, r) => acc + (r.completedDeliveries || 0), 0);

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Fleet</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalRiders}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Riders</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{activeRiders}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Tasks</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalActiveTasks}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Delivered</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalCompletedDeliveries}</p>
          </div>
        </div>
      </div>

      {/* Action Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search riders by name, phone, email, or zone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-primary-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchRiders}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-primary-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
            title="Refresh Rider Fleet"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-xl shadow-xs flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add New Rider</span>
          </button>
        </div>
      </div>

      {/* Riders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary-600 mb-2" />
            <p className="text-sm font-medium">Loading rider fleet...</p>
          </div>
        ) : filteredRiders.length === 0 ? (
          <div className="p-12 text-center">
            <Bike className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-700">No riders found</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? 'Try matching a different search keyword.' : 'Click "Add New Rider" to onboard your first delivery associate.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Rider Details</th>
                  <th className="py-3.5 px-4">Vehicle & Zone</th>
                  <th className="py-3.5 px-4 text-center">Live Tasks</th>
                  <th className="py-3.5 px-4 text-center">Delivered</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRiders.map((rider) => (
                  <tr key={rider._id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Rider Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-primary-600 text-white font-bold flex items-center justify-center shrink-0">
                          {rider.name?.charAt(0) || 'R'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{rider.name}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {rider.phone}
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {rider.email}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Vehicle & Zone */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {rider.riderDetails?.vehicleType || 'Bike'}
                          </span>
                          {rider.riderDetails?.vehicleNumber && (
                            <span className="text-xs font-mono font-medium text-slate-600">
                              {rider.riderDetails.vehicleNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {rider.riderDetails?.assignedZone || 'All Zones'}
                        </p>
                      </div>
                    </td>

                    {/* Live Assigned Tasks */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRider(rider);
                          setShowTasksModal(true);
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                          rider.activeAssignedOrders > 0
                            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                        title="Click to view assigned tasks"
                      >
                        <ListChecks className="w-3.5 h-3.5" />
                        <span>{rider.activeAssignedOrders || 0} active</span>
                      </button>
                    </td>

                    {/* Completed Deliveries */}
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                      {rider.completedDeliveries || 0}
                    </td>

                    {/* Status Toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(rider._id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                          rider.isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                        title={`Click to ${rider.isActive ? 'deactivate' : 'activate'} rider`}
                      >
                        {rider.isActive ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            Deactivated
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(rider)}
                          className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Edit Rider Profile & Zone"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRider(rider);
                            setShowDeleteModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete / Decommission Rider"
                        >
                          <Trash2 className="w-4 h-4" />
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
      {/* ADD RIDER MODAL */}
      {/* ===================================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                  <Bike className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Add New Delivery Rider</h3>
                  <p className="text-xs text-slate-500">Create an authenticated fleet account</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRider} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Phone (10 Digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="rider@indodhobi.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Login Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={addForm.vehicleType}
                    onChange={(e) => setAddForm({ ...addForm, vehicleType: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 outline-hidden"
                  >
                    {VEHICLE_OPTIONS.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    placeholder="DL 01 AB 1234"
                    value={addForm.vehicleNumber}
                    onChange={(e) => setAddForm({ ...addForm, vehicleNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 outline-hidden uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Assigned Zone
                  </label>
                  <select
                    value={addForm.assignedZone}
                    onChange={(e) => setAddForm({ ...addForm, assignedZone: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 outline-hidden"
                  >
                    {ZONE_OPTIONS.map((z) => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-xl shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? 'Creating Rider...' : 'Create Rider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* EDIT RIDER MODAL */}
      {/* ===================================================================== */}
      {showEditModal && selectedRider && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Edit Rider: {selectedRider.name}</h3>
                  <p className="text-xs text-slate-500">Update contact, vehicle, or zone details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRider} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={editForm.vehicleType}
                    onChange={(e) => setEditForm({ ...editForm, vehicleType: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 outline-hidden"
                  >
                    {VEHICLE_OPTIONS.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    value={editForm.vehicleNumber}
                    onChange={(e) => setEditForm({ ...editForm, vehicleNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 outline-hidden uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Assigned Zone
                  </label>
                  <select
                    value={editForm.assignedZone}
                    onChange={(e) => setEditForm({ ...editForm, assignedZone: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 outline-hidden"
                  >
                    {ZONE_OPTIONS.map((z) => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reset Password (Leave blank to keep existing)
                </label>
                <input
                  type="password"
                  placeholder="New password (optional)"
                  value={editForm.newPassword}
                  onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-xl shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW TASKS MODAL */}
      {/* ===================================================================== */}
      {showTasksModal && selectedRider && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <ListChecks className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Active Tasks: {selectedRider.name}</h3>
                  <p className="text-xs text-slate-500">Live order assignments in transit</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTasksModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto divide-y divide-slate-100">
              {(!selectedRider.assignedOrders || selectedRider.assignedOrders.length === 0) ? (
                <div className="text-center py-10">
                  <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">No active tasks assigned</p>
                  <p className="text-xs text-slate-400 mt-1">This rider currently has zero pending orders.</p>
                </div>
              ) : (
                selectedRider.assignedOrders.map((order) => (
                  <div key={order._id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{order.orderNumber}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-50 text-primary-700 border border-primary-200">
                          {order.orderStatus}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {order.pickupAddress?.flatAndBuilding}, {order.pickupAddress?.city}
                      </p>
                      <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-1">
                        <span>Pickup: {order.pickupSchedule?.date} ({order.pickupSchedule?.timeSlot})</span>
                        <span>Delivery: {order.deliverySchedule?.date} ({order.deliverySchedule?.timeSlot})</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-900 text-sm">
                        ₹{order.pricingBreakdown?.finalPayable || 0}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                type="button"
                onClick={() => setShowTasksModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DELETE / DECOMMISSION CONFIRMATION MODAL */}
      {/* ===================================================================== */}
      {showDeleteModal && selectedRider && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Decommission Rider?</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Are you sure you want to remove <strong>{selectedRider.name}</strong> ({selectedRider.phone})?
                  If this rider has delivered historical orders, their account will be deactivated and active tasks unassigned to preserve audit invoice integrity.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm rounded-xl shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Yes, Decommission'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRidersTab;
