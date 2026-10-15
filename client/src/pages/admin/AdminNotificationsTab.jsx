import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Send, 
  RefreshCw, 
  Radio, 
  Users, 
  User, 
  Tag, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { adminService } from '../../services/api';
import toast from 'react-hot-toast';

const NOTIF_TYPES = [
  { value: 'PROMO', label: 'Promotion / Discount', icon: Tag, color: 'text-purple-600 bg-purple-50' },
  { value: 'SYSTEM_ALERT', label: 'System Alert / Weather', icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
  { value: 'GENERAL', label: 'General Announcement', icon: MessageSquare, color: 'text-blue-600 bg-blue-50' },
  { value: 'ORDER_UPDATE', label: 'Order Update', icon: Sparkles, color: 'text-emerald-600 bg-emerald-50' }
];

const AdminNotificationsTab = () => {
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form State
  const [targetType, setTargetType] = useState('BROADCAST'); // 'BROADCAST' | 'TARGETED'
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('PROMO');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [notifsRes, usersRes] = await Promise.all([
        adminService.getNotifications(),
        adminService.getUsers()
      ]);

      if (notifsRes.success) {
        setNotifications(notifsRes.data || []);
      }
      if (usersRes.success) {
        setUsers(usersRes.data || []);
      }
    } catch (err) {
      console.error('[Admin Notifications Error]:', err);
      toast.error('Failed to load notifications history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Please enter both title and message.');
      return;
    }

    if (targetType === 'TARGETED' && !selectedRecipient) {
      toast.error('Please select a recipient user.');
      return;
    }

    try {
      setSending(true);
      const payload = {
        title,
        message,
        type,
        isBroadcast: targetType === 'BROADCAST',
        recipient: targetType === 'TARGETED' ? selectedRecipient : null
      };

      const res = await adminService.sendNotification(payload);
      if (res.success) {
        toast.success(res.message || 'Notification broadcast successfully!');
        setTitle('');
        setMessage('');
        fetchData();
      }
    } catch (err) {
      console.error('[Send Notification Error]:', err);
      toast.error(err.response?.data?.message || 'Failed to dispatch notification.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Broadcast Announcements & Alerts</h2>
            <p className="text-xs text-slate-500">
              Send live push notifications and promotional alerts to customers and riders.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="p-2 text-slate-600 hover:text-primary-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
          title="Refresh Feed"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Create Notification Form */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs h-fit">
          <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <Send className="w-4 h-4 text-primary-600" />
            Dispatch New Notification
          </h3>

          <form onSubmit={handleSendNotification} className="space-y-4">
            {/* Target Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Recipient Target
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType('BROADCAST')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    targetType === 'BROADCAST'
                      ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  All Users (Broadcast)
                </button>

                <button
                  type="button"
                  onClick={() => setTargetType('TARGETED')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    targetType === 'TARGETED'
                      ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Specific User
                </button>
              </div>
            </div>

            {/* Targeted User Dropdown */}
            {targetType === 'TARGETED' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select Recipient *
                </label>
                <select
                  value={selectedRecipient}
                  onChange={(e) => setSelectedRecipient(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 outline-hidden"
                >
                  <option value="">-- Choose User --</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.phone || u.email}) - {u.role}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Notification Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Notification Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {NOTIF_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center gap-2 ${
                      type === t.value
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <t.icon className={`w-3.5 h-3.5 ${type === t.value ? 'text-white' : 'text-slate-500'}`} />
                    <span className="truncate">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Notification Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 50% Off On All Woolen Blankets!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 outline-hidden font-bold"
              />
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Announcement Message *
              </label>
              <textarea
                rows={4}
                required
                placeholder="Use coupon code WINTER50 at checkout to claim your flat discount. Valid till Sunday midnight!"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-primary-500 outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{sending ? 'Dispatching...' : 'Dispatch Notification'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Sent Notifications Feed */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Recent Notifications Log ({notifications.length})
            </h3>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary-600 mb-2" />
              <p className="text-sm font-medium">Loading history...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700">No notifications sent yet</p>
              <p className="text-xs text-slate-400 mt-1">Dispatched announcements will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {notifications.map((n) => (
                <div
                  key={n._id}
                  className="p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-colors bg-white shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        n.isBroadcast
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-teal-100 text-teal-800'
                      }`}>
                        {n.isBroadcast ? 'Broadcast to All' : `Targeted: ${n.recipient?.name || 'User'}`}
                      </span>

                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                        {n.type}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400">
                      {new Date(n.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm mt-2">{n.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {n.isBroadcast
                        ? `Read by ${n.readBy?.length || 0} user(s)`
                        : n.isRead ? 'Status: Read by recipient' : 'Status: Unread'}
                    </span>
                    {n.orderNumber && (
                      <span className="font-mono font-bold text-slate-600">
                        Order #{n.orderNumber}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminNotificationsTab;
