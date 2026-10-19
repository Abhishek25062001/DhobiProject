import OrderProgress, { OrderStatusBadge } from '../components/OrderProgress';
import { useCustomerOrders } from '../context/CustomerOrdersContext';
import { isActiveOrder } from '../../../shared/orderStages.mjs';
import { cleanAddress } from '../../../shared/addressBook.mjs';
import ContentState from '../components/ContentState';
import { useGlobalContent } from '../context/SiteContentContext';
import { activeOptions } from '../../../shared/bookingChoices.mjs';
import usePageCopy from '../hooks/usePageCopy';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService, orderService } from '../services/api';
import {
  User as UserIcon,
  Mail,
  Phone,
  ShieldCheck,
  Camera,
  Plus,
  Trash2,
  Edit3,
  MapPin,
  CheckCircle2,
  Clock,
  Sparkles,
  Package,
  Lock,
  Building,
  ChevronRight,
  Calendar,
  AlertCircle,
  Loader2,
  Save,
  X,
  CreditCard,
  Receipt
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Link, useLocation } from 'react-router-dom';
import GstInvoiceModal from '../components/GstInvoiceModal';

const ProfilePage = () => {
  const copy = usePageCopy('profile');
  const location = useLocation();
  const { config } = useGlobalContent();
  const {
    user,
    updateUser,
    uploadAvatar,
    addAlternatePhone,
    deleteAlternatePhone,
    addAddress,
    updateAddress,
    deleteAddress
  } = useAuth();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Profile data & Stats
  const [profileStats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    totalSpent: 0
  });
  const orderFeed = useCustomerOrders();
  const recentOrders = orderFeed.orders.slice(0, 10);
  const stats = orderFeed.lastUpdated ? {
    totalOrders: orderFeed.orders.length,
    activeOrders: orderFeed.orders.filter(isActiveOrder).length,
    completedOrders: orderFeed.orders.filter(order => order.orderStatus === 'DELIVERED').length,
    totalSpent: orderFeed.orders.filter(order => order.payment?.status === 'PAID' || order.orderStatus === 'DELIVERED').reduce((sum, order) => sum + (order.pricingBreakdown?.grandTotal || 0), 0),
  } : profileStats;
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);

  // Form State: Personal Info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [defaultDetergent, setDefaultDetergent] = useState('');
  const [defaultPackaging, setDefaultPackaging] = useState('');

  // Form State: Alternate Phone
  const [showAddPhone, setShowAddPhone] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [newPhoneLabel, setNewPhoneLabel] = useState('Spouse');
  const [addingPhone, setAddingPhone] = useState(false);

  // Form State: Address Modal (Add / Edit)
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState({
    label: 'Home',
    flatAndBuilding: '',
    streetAndLandmark: '',
    city: 'New Delhi',
    pincode: '',
    contactPhone: '',
    isDefault: false
  });
  const [savingAddress, setSavingAddress] = useState(false);

  // Active Tab: 'profile' (Personal & Addresses) | 'orders' (Order History)
  const [activeTab, setActiveTab] = useState('profile');

  // Load profile and stats from database
  const loadProfileData = async () => {
    try {
      setLoading(true);
      const res = await authService.getProfile();
      if (res.success) {
        if (res.user) {
          updateUser(res.user);
          setName(res.user.name || '');
          setEmail(res.user.email || '');
          if (res.user.preferences) {
            setDefaultDetergent(res.user.preferences.defaultDetergent || '');
            setDefaultPackaging(res.user.preferences.defaultPackaging || '');
          }
        }
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (err) {
      console.error('[Load Profile Error]:', err);
      toast.error('Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, []);

  // Update Personal Info & Preferences
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name || !name.trim()) {
      toast.error('Name cannot be empty.');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await authService.updateProfile({
        name: name.trim(),
        email: email.trim() || undefined,
        preferences: {
          defaultDetergent,
          defaultPackaging
        }
      });

      if (res.success && res.user) {
        updateUser(res.user);
        toast.success('Profile and preferences updated successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Avatar Upload via Cloudinary
  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      setUploadingAvatar(true);
      try {
        await uploadAvatar(base64Data);
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Add Alternate Phone
  const handleAddAlternatePhone = async (e) => {
    e.preventDefault();
    const cleanDigits = newPhoneNumber.replace(/\D/g, '').slice(-10);
    if (cleanDigits.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number.');
      return;
    }

    setAddingPhone(true);
    try {
      const res = await addAlternatePhone({
        number: cleanDigits,
        label: newPhoneLabel
      });
      if (res.success) {
        setNewPhoneNumber('');
        setShowAddPhone(false);
      }
    } finally {
      setAddingPhone(false);
    }
  };

  // Open Address Modal for Create or Edit
  const handleOpenAddressModal = (addressToEdit = null) => {
    if (addressToEdit) {
      setEditingAddressId(addressToEdit._id);
      setAddressForm({
        label: addressToEdit.label || 'Home',
        flatAndBuilding: addressToEdit.flatAndBuilding || '',
        streetAndLandmark: addressToEdit.streetAndLandmark || '',
        city: addressToEdit.city || 'New Delhi',
        pincode: addressToEdit.pincode || '',
        contactPhone: addressToEdit.contactPhone || '',
        isDefault: Boolean(addressToEdit.isDefault)
      });
    } else {
      setEditingAddressId(null);
      setAddressForm({
        label: 'Home',
        flatAndBuilding: '',
        streetAndLandmark: '',
        city: 'New Delhi',
        pincode: '',
        contactPhone: user?.phone || '',
        isDefault: (user?.addresses || []).length === 0
      });
    }
    setAddressModalOpen(true);
  };

  // Save Address (Create or Edit)
  const handleSaveAddress = async (e) => {
    e.preventDefault();
    try { cleanAddress(addressForm); }
    catch (error) { toast.error(error.message); return; }

    setSavingAddress(true);
    try {
      const result = editingAddressId ? await updateAddress(editingAddressId, addressForm) : await addAddress(addressForm);
      if (result?.success) setAddressModalOpen(false);
    } finally {
      setSavingAddress(false);
    }
  };

  // Set Address as Default
  const handleSetDefaultAddress = async (addressId) => {
    try {
      await updateAddress(addressId, { isDefault: true });
    } catch (err) {
      toast.error('Failed to set default address.');
    }
  };

  useEffect(() => {
    if (!loading && location.hash === '#manage-addresses') document.getElementById('manage-addresses')?.scrollIntoView({ block: 'start' });
  }, [loading, location.hash]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <span className="text-sm font-semibold">{copy('loading_profile_4a47f12')}</span>
        </div>
      </div>
    );
  }

  const memberSince = user?.createdAt ? format(new Date(user.createdAt), 'MMMM yyyy') : 'October 2026';

  return (
    <ContentState resource={copy}><div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* ──────────────── SECTION A: Profile Header & Avatar ──────────────── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary-50 via-teal-50 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none opacity-60"></div>
        
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar with Camera Button */}
            <div className="relative group">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-gradient-to-tr from-primary-600 to-teal-500 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-md border-2 border-white">
                {(() => {
                  const avatarSrc = user?.profileImage?.url || user?.profileImage?.imageUrl || (typeof user?.profileImage === 'string' ? user.profileImage : '');
                  return (
                    <>
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt={user?.name || copy('user_b512d97')}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.parentElement?.querySelector('.profile-avatar-fallback');
                            if (fallback) fallback.style.display = 'inline';
                          }}
                        />
                      ) : null}
                      <span
                        className="profile-avatar-fallback"
                        style={{ display: avatarSrc ? 'none' : 'inline' }}
                      >
                        {user?.name?.charAt(0) || copy('u_a25513c')}
                      </span>
                    </>
                  );
                })()}
              </div>
              <label
                htmlFor="avatar-upload-input"
                className="absolute -bottom-1.5 -right-1.5 bg-slate-900 hover:bg-primary-600 text-white p-2 rounded-xl shadow-md cursor-pointer transition-colors border-2 border-white"
                title={copy('upload_profile_photo_5532247')}
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
                <input
                  id="avatar-upload-input"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  disabled={uploadingAvatar}
                  className="hidden"
                />
              </label>
            </div>

            {/* User Meta */}
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {user?.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary-50 text-primary-700 border border-primary-200">
                  {user?.role || copy('customer_bf37633')}
                </span>
                {user?.isPhoneVerified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    <CheckCircle2 className="w-3 h-3 text-teal-600" />{copy('verified_4f78384')}</span>
                )}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <span>{copy('member_since_5c4a4c9')}{memberSince}</span>
                <span>•</span>
                <span className="font-mono text-slate-700">+91 {user?.phone}</span>
              </p>
            </div>
          </div>

          {/* Quick Account Stats */}
          <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-center min-w-[90px]">
              <span className="text-xs text-slate-500 font-semibold block">{copy('total_orders_8075b35')}</span>
              <span className="text-xl font-black text-slate-900">{stats.totalOrders}</span>
            </div>
            <div className="bg-teal-50/60 border border-teal-200/60 rounded-2xl p-3.5 text-center min-w-[90px]">
              <span className="text-xs text-teal-700 font-semibold block">{copy('active_9234069')}</span>
              <span className="text-xl font-black text-teal-800">{stats.activeOrders}</span>
            </div>
            <div className="bg-primary-50/60 border border-primary-200/60 rounded-2xl p-3.5 text-center min-w-[90px]">
              <span className="text-xs text-primary-700 font-semibold block">{copy('total_spent_9439a28')}</span>
              <span className="text-xl font-black text-primary-800">₹{stats.totalSpent}</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mt-6 pt-6 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >{copy('personal_info_addresses_e2c67e4')}</button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'orders'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{copy('recent_orders_abe336b')}{recentOrders.length})</span>
          </button>
        </div>
      </div>

      {/* ──────────────── TAB 1: Profile & Addresses ──────────────── */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1 & 2: Personal Info & Preferences */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Personal Details Form */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{copy('personal_information_c4b37e8')}</h2>
                  <p className="text-xs text-slate-500">{copy('manage_your_name_email_and_primary_contact_details_9231207')}</p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">{copy('full_name_8e00cdf')}</label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={copy('rohan_sharma_2a9e09d')}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-medium text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">{copy('email_address_09bf25e')}</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={copy('rohan_example_com_0733eda')}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-medium text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Phone Number (Locked & Immutable) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-semibold text-slate-700">{copy('primary_mobile_number_6139384')}</label>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <Lock className="w-2.5 h-2.5" />{copy('verified_primary_identity_locked_a841a6b')}</span>
                  </div>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      disabled
                      readOnly
                      value={`+91 ${user?.phone}`}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 font-mono text-slate-500 cursor-not-allowed select-none font-semibold"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{copy('your_primary_phone_is_linked_to_your_otp_login_and_cannot_be_alte_d8f090b')}</p>
                </div>

                {/* Wash Preferences */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary-600" />
                    <span>{copy('default_wash_preferences_357976c')}</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">{copy('preferred_detergent_00903c6')}</label>
                      <select
                        value={defaultDetergent}
                        onChange={(e) => setDefaultDetergent(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-medium text-slate-800 bg-white"
                      >
                        <option value="">{copy('choosePreference')}</option>
                        {!activeOptions(config?.detergentOptions).some(option => option.code === defaultDetergent) && defaultDetergent && <option value={defaultDetergent} disabled>{copy('unavailablePreference')}</option>}
                        {activeOptions(config?.detergentOptions).map(option => <option key={option.code} value={option.code}>{option.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">{copy('preferred_packaging_76e474a')}</label>
                      <select
                        value={defaultPackaging}
                        onChange={(e) => setDefaultPackaging(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-primary-500 font-medium text-slate-800 bg-white"
                      >
                        <option value="">{copy('choosePreference')}</option>
                        {!activeOptions(config?.packagingOptions).some(option => option.code === defaultPackaging) && defaultPackaging && <option value={defaultPackaging} disabled>{copy('unavailablePreference')}</option>}
                        {activeOptions(config?.packagingOptions).map(option => <option key={option.code} value={option.code}>{option.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="py-2.5 px-6 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-md shadow-primary-600/20 transition-all flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {savingProfile ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>{copy('save_profile_changes_37a7634')}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* ──────────────── Alternate Phone Numbers Manager ──────────────── */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{copy('alternate_phone_numbers_4274962')}</h2>
                  <p className="text-xs text-slate-500">{copy('secondary_numbers_our_pickup_delivery_riders_can_contact_3409b7b')}</p>
                </div>
                {!showAddPhone && (
                  <button
                    type="button"
                    onClick={() => setShowAddPhone(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{copy('add_phone_106d14a')}</span>
                  </button>
                )}
              </div>

              {/* Add Alternate Phone Form */}
              {showAddPhone && (
                <form onSubmit={handleAddAlternatePhone} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{copy('add_new_alternate_contact_number_a91487c')}</span>
                    <button
                      type="button"
                      onClick={() => setShowAddPhone(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">{copy('mobile_number_10_digits_8376c49')}</label>
                      <input
                        type="tel"
                        required
                        maxLength="10"
                        placeholder="9876543210"
                        value={newPhoneNumber}
                        onChange={(e) => setNewPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-slate-800 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">{copy('label_0e66373')}</label>
                      <select
                        value={newPhoneLabel}
                        onChange={(e) => setNewPhoneLabel(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 bg-white"
                      >
                        <option value="Spouse">{copy('spouse_f8930c3')}</option>
                        <option value="Home / Family">{copy('home_family_66be73b')}</option>
                        <option value="Office / Desk">{copy('office_desk_2908cb5')}</option>
                        <option value="Security Guard">{copy('security_guard_2ebe3cc')}</option>
                        <option value="Alternate">{copy('other_alternate_e219976')}</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddPhone(false)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                    >{copy('cancel_19766ed')}</button>
                    <button
                      type="submit"
                      disabled={addingPhone || newPhoneNumber.length !== 10}
                      className="px-4 py-1.5 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 transition-colors flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                    >
                      {addingPhone ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>{copy('save_number_ad24180')}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Alternate Phones List */}
              <div className="space-y-2">
                {(user?.alternatePhones || []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">{copy('no_alternate_phone_numbers_added_yet_351cfce')}</p>
                ) : (
                  user.alternatePhones.map((phoneItem) => (
                    <div
                      key={phoneItem._id}
                      className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-mono font-bold text-xs text-slate-900">+91 {phoneItem.number}</span>
                          <span className="ml-2 text-[10px] font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md">
                            {phoneItem.label}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => deleteAlternatePhone(phoneItem._id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title={copy('delete_number_121dbb8')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Column 3: Saved Addresses Manager */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 id="manage-addresses" className="scroll-mt-28 text-lg font-bold text-slate-900">Manage Addresses</h2>
                  <p className="text-xs text-slate-500">{(user?.addresses || []).length}{copy('address_es_saved_b157679')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenAddressModal(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{copy('add_new_c1dc92c')}</span>
                </button>
              </div>

              {/* Addresses List */}
              <div className="space-y-3">
                {(user?.addresses || []).length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
                    <MapPin className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-xs text-slate-500 font-medium">{copy('no_saved_addresses_90b81d0')}</p>
                    <button
                      type="button"
                      onClick={() => handleOpenAddressModal(null)}
                      className="text-xs font-bold text-primary-600 hover:underline cursor-pointer"
                    >{copy('add_your_first_address_da33554')}</button>
                  </div>
                ) : (
                  user.addresses.map((addr) => (
                    <div
                      key={addr._id}
                      className={`p-4 rounded-2xl border transition-all ${
                        addr.isDefault
                          ? 'border-primary-500/80 bg-primary-50/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{addr.label}</span>
                          {addr.isDefault && (
                            <span className="bg-primary-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-md">{copy('default_89dbf71')}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenAddressModal(addr)}
                            aria-label={`Edit ${addr.label} address`}
                            className="p-3 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title={copy('edit_address_6a8fa16')}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => { if (window.confirm(`Delete your ${addr.label} address? Existing orders keep their original address.`)) deleteAddress(addr._id); }}
                            aria-label={`Delete ${addr.label} address`}
                            className="p-3 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title={copy('delete_address_646f172')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {addr.flatAndBuilding}, {addr.streetAndLandmark}
                      </p>
                      <p className="text-xs text-slate-500">
                        {addr.city} — {addr.pincode}
                      </p>
                      {addr.contactPhone && (
                        <p className="text-[11px] text-slate-400 mt-1 font-mono">{copy('phone_91_466cd7f')}{addr.contactPhone}
                        </p>
                      )}

                      {!addr.isDefault && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleSetDefaultAddress(addr._id)}
                            className="text-[11px] font-bold text-primary-600 hover:underline cursor-pointer"
                          >{copy('set_as_default_1088655')}</button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ──────────────── TAB 2: Order & Booking History ──────────────── */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{copy('recent_order_history_376d9ed')}</h2>
              <p className="text-xs text-slate-500">{copy('live_order_status_and_past_invoices_from_indodhobi_729c74d')}</p>
            </div>
            <Link
              to="/book"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-xs transition-colors cursor-pointer"
            >{copy('book_new_laundry_ec8c651')}</Link>
          </div>

          <p role="status" className={orderFeed.error ? 'text-sm text-amber-800' : 'text-sm text-teal-700'}>{orderFeed.error ? 'Order updates paused. Retrying automatically.' : 'Auto-updating · Your booking status stays in sync across pages.'}</p>
          {orderFeed.loading ? <p role="status">Loading order history…</p> : orderFeed.error && !recentOrders.length ? <button type="button" onClick={orderFeed.refresh} className="underline text-primary-700">Retry loading order history</button> : recentOrders.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl space-y-3">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-700 text-sm">{copy('no_orders_placed_yet_97a4a29')}</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">{copy('schedule_your_first_doorstep_pickup_and_enjoy_clean_fresh_crisp_c_9ba0cad')}</p>
              <Link
                to="/book"
                className="inline-block mt-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-md shadow-primary-600/20"
              >{copy('book_your_first_wash_9a6c87f')}</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => {
                const totalItems = (order.items || []).reduce((acc, curr) => acc + (curr.quantity || 1), 0);
                const orderDate = order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy, hh:mm a') : '';
                
                return (
                  <div
                    key={order._id}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono font-black text-sm text-slate-900">{order.orderNumber}</span>
                        <OrderStatusBadge order={order} />
                        {order.orderStatus === 'CANCELLED' || order.payment?.status === 'CANCELLED' ? (
                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{copy('cancelled_8ab6812')}</span>
                        ) : order.payment?.status === 'REFUNDED' ? (
                          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">{copy('refunded_6e72ba4')}</span>
                        ) : order.payment?.status === 'PAID' ? (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">{copy('paid_e17956e')}</span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            {order.payment?.method || copy('cod_ca8c637')}{copy('pending_367b499')}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{copy('placed_on_bbba0c2')}{orderDate} • {totalItems}{copy('garment_s_08e579c')}</p>
                      <p className="text-xs text-slate-600 font-medium">{copy('pickup_5571c3f')}{order.pickupSchedule?.date} ({order.pickupSchedule?.timeSlot})
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                      <span className="text-base font-black text-slate-900">
                        ₹{order.pricingBreakdown?.grandTotal}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoiceOrder(order)}
                          className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 hover:bg-teal-100 transition-colors"
                          title={copy('view_download_pdf_invoice_723afdb')}
                        >
                          <Receipt className="w-3 h-3" />
                          <span>{copy('receipt_dad5a96')}</span>
                        </button>
                        <Link
                          to={`/my-orders?order=${encodeURIComponent(order._id)}`}
                          className="text-xs font-bold text-primary-600 hover:underline flex items-center gap-0.5"
                        >
                          <span>{copy('details_45989de')}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                    </div>
                    <OrderProgress order={order} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ──────────────── Address Add/Edit Modal ──────────────── */}
      {addressModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-label={editingAddressId ? "Edit address" : "Add address"} className="bg-white max-h-[90dvh] overflow-y-auto rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingAddressId ? copy('edit_address_6a8fa16') : copy('add_new_address_b469da3')}
              </h3>
              <button
                type="button"
                onClick={() => setAddressModalOpen(false)}
                aria-label="Close address form"
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{copy('address_label_ebb25f3')}</label>
                <div className="flex gap-2">
                  {['Home', 'Work', 'Other'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAddressForm({ ...addressForm, label: type })}
                      aria-pressed={addressForm.label === type}
                      className={`flex-1 py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                        addressForm.label === type
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{copy('flat_house_floor_building_fa37d31')}</label>
                <input
                  type="text"
                  required
                  placeholder={copy('e_g_flat_402_tower_4_royal_palms_c2fa049')}
                  autoFocus
                  aria-label="Flat and building"
                  value={addressForm.flatAndBuilding}
                  onChange={(e) => setAddressForm({ ...addressForm, flatAndBuilding: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{copy('street_landmark_d2a2589')}</label>
                <input
                  type="text"
                  required
                  placeholder={copy('e_g_barakhamba_road_near_metro_gate_2_916b71c')}
                  aria-label="Street and landmark"
                  value={addressForm.streetAndLandmark}
                  onChange={(e) => setAddressForm({ ...addressForm, streetAndLandmark: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{copy('city_fc33f73')}</label>
                  <input
                    type="text"
                    required
                    aria-label="City"
                  value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{copy('pincode_6_digits_a2bca2d')}</label>
                  <input
                    type="text"
                    required
                    maxLength="6"
                    pattern="[1-9][0-9]{5}"
                    inputMode="numeric"
                    placeholder="110001"
                    aria-label="Pincode"
                  value={addressForm.pincode}
                    onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-medium text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{copy('contact_phone_for_this_address_ce5f21d')}<span className="text-slate-400 font-normal">{copy('optional_ab05200')}</span>
                </label>
                <input
                  type="tel"
                  maxLength="10"
                  placeholder="9876543210"
                  aria-label="Contact phone"
                  value={addressForm.contactPhone}
                  onChange={(e) => setAddressForm({ ...addressForm, contactPhone: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-medium text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="defaultAddressCheckbox"
                  disabled={!user?.addresses?.length || Boolean(user?.addresses?.find(address => address._id === editingAddressId)?.isDefault)}
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                  className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="defaultAddressCheckbox" className="font-semibold text-slate-700 cursor-pointer">{copy('set_as_default_delivery_address_a3b2147')}</label>
              </div>

              <p className="text-xs text-slate-500">Your default is selected for future bookings. Pickup and delivery availability is checked at checkout.</p>
              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddressModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >{copy('cancel_19766ed')}</button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="px-5 py-2 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                >
                  {savingAddress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{editingAddressId ? copy('save_changes_35322b5') : copy('add_address_9ccfb5a')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────── GST Invoice & PDF Download Modal ──────────────── */}
      {selectedInvoiceOrder && (
        <GstInvoiceModal
          order={selectedInvoiceOrder}
          isOpen={Boolean(selectedInvoiceOrder)}
          onClose={() => setSelectedInvoiceOrder(null)}
        />
      )}

    </div></ContentState>
  );
};

export default ProfilePage;
