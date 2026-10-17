import User, { normalizePhone } from '../models/User.js';
import Order from '../models/Order.js';
import Category from '../models/Category.js';
import Notification from '../models/Notification.js';
import bcrypt from 'bcryptjs';

// ============================================================================
// 1. RIDER FLEET MANAGEMENT (REQUIREMENT #6)
// ============================================================================

// @desc    Get all riders with assigned order statistics and live tasks
// @route   GET /api/admin/riders
// @access  Private (Admin only)
export const getAdminRiders = async (req, res) => {
  try {
    const riders = await User.find({ role: 'rider' }).select('-password').sort({ createdAt: -1 });

    const ridersWithStats = await Promise.all(
      riders.map(async (rider) => {
        const [activeCount, completedCount, activeOrders] = await Promise.all([
          Order.countDocuments({
            'logistics.assignedRider': rider._id,
            orderStatus: { $nin: ['DELIVERED', 'CANCELLED'] }
          }),
          Order.countDocuments({
            'logistics.assignedRider': rider._id,
            orderStatus: 'DELIVERED'
          }),
          Order.find({
            'logistics.assignedRider': rider._id,
            orderStatus: { $nin: ['DELIVERED', 'CANCELLED'] }
          })
            .select('orderNumber orderStatus pickupSchedule deliverySchedule pickupAddress pricingBreakdown createdAt')
            .sort({ updatedAt: -1 })
            .limit(10)
        ]);

        return {
          _id: rider._id,
          name: rider.name,
          email: rider.email,
          phone: rider.phone,
          role: rider.role,
          isActive: rider.isActive !== false,
          riderDetails: rider.riderDetails || {
            vehicleType: 'Bike',
            vehicleNumber: '',
            assignedZone: 'All Zones',
            joiningDate: rider.createdAt
          },
          activeAssignedOrders: activeCount,
          completedDeliveries: completedCount,
          assignedOrders: activeOrders,
          createdAt: rider.createdAt
        };
      })
    );

    return res.json({
      success: true,
      count: ridersWithStats.length,
      riders: ridersWithStats,
      data: ridersWithStats
    });
  } catch (error) {
    console.error('[Admin Get Riders Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve riders list.'
    });
  }
};

// @desc    Create a new rider account
// @route   POST /api/admin/riders
// @access  Private (Admin only)
export const createRider = async (req, res) => {
  try {
    const { name, phone, email, password, vehicleType, vehicleNumber, assignedZone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Rider full name and mobile phone number are required.'
      });
    }

    const cleanPhone = normalizePhone(phone);
    if (cleanPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit mobile number.'
      });
    }

    const existingPhone = await User.findOne({ phone: cleanPhone });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'A user or rider with this mobile number already exists.'
      });
    }

    if (email && email.trim()) {
      const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'A user with this email address already exists.'
        });
      }
    }

    // Use provided password or auto-generate secure temporary password
    const rawPassword = (password && password.trim().length >= 6)
      ? password.trim()
      : `Rider@${cleanPhone.slice(-4)}!`;

    // Note: User pre-save hook will hash rawPassword via bcrypt
    const rider = await User.create({
      name: name.trim(),
      phone: cleanPhone,
      email: email ? email.trim().toLowerCase() : `rider_${cleanPhone}@indodhobi.internal`,
      password: rawPassword,
      role: 'rider',
      isActive: true,
      isPhoneVerified: true,
      isProfileComplete: true,
      riderDetails: {
        vehicleType: vehicleType && ['Bike', 'Scooter', 'EV Van', 'Cycle'].includes(vehicleType) ? vehicleType : 'Bike',
        vehicleNumber: (vehicleNumber && vehicleNumber.trim().toUpperCase()) || '',
        assignedZone: (assignedZone && assignedZone.trim()) || 'All Zones',
        joiningDate: new Date()
      }
    });

    const formattedRider = {
      _id: rider._id,
      name: rider.name,
      email: rider.email,
      phone: rider.phone,
      role: rider.role,
      isActive: rider.isActive,
      riderDetails: rider.riderDetails
    };

    return res.status(201).json({
      success: true,
      message: `Rider ${rider.name} created successfully.`,
      tempPassword: rawPassword,
      rider: formattedRider,
      data: formattedRider
    });
  } catch (error) {
    console.error('[Admin Create Rider Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create rider.'
    });
  }
};

// @desc    Update rider details, vehicle, zone, or password
// @route   PUT /api/admin/riders/:id
// @access  Private (Admin only)
export const updateRider = async (req, res) => {
  try {
    const rider = await User.findOne({ _id: req.params.id, role: 'rider' }).select('+password');

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'Rider not found.'
      });
    }

    const { name, email, password, vehicleType, vehicleNumber, assignedZone, isActive } = req.body;

    if (name && name.trim()) rider.name = name.trim();
    if (isActive !== undefined) rider.isActive = Boolean(isActive);

    if (email !== undefined) {
      const emailToSet = email ? email.trim().toLowerCase() : undefined;
      if (emailToSet && emailToSet !== rider.email) {
        const existingEmail = await User.findOne({ email: emailToSet, _id: { $ne: rider._id } });
        if (existingEmail) {
          return res.status(400).json({
            success: false,
            message: 'A user with this email address already exists.'
          });
        }
      }
      rider.email = emailToSet;
    }

    if (!rider.riderDetails) {
      rider.riderDetails = {
        vehicleType: 'Bike',
        vehicleNumber: '',
        assignedZone: 'All Zones',
        joiningDate: rider.createdAt || new Date()
      };
    }

    if (vehicleType && ['Bike', 'Scooter', 'EV Van', 'Cycle'].includes(vehicleType)) {
      rider.riderDetails.vehicleType = vehicleType;
    }
    if (vehicleNumber !== undefined) {
      rider.riderDetails.vehicleNumber = vehicleNumber.trim().toUpperCase();
    }
    if (assignedZone !== undefined) {
      rider.riderDetails.assignedZone = assignedZone.trim() || 'All Zones';
    }

    // Update password if provided
    if (password && password.trim().length >= 6) {
      rider.password = password.trim(); // Will be hashed by pre('save') hook
    }

    await rider.save();

    const formattedRider = {
      _id: rider._id,
      name: rider.name,
      email: rider.email,
      phone: rider.phone,
      role: rider.role,
      isActive: rider.isActive,
      riderDetails: rider.riderDetails
    };

    return res.json({
      success: true,
      message: 'Rider updated successfully.',
      rider: formattedRider,
      data: formattedRider
    });
  } catch (error) {
    console.error('[Admin Update Rider Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update rider.'
    });
  }
};

// @desc    Toggle rider activation status (instant login block)
// @route   PATCH /api/admin/riders/:id/status
// @access  Private (Admin only)
export const toggleRiderStatus = async (req, res) => {
  try {
    const rider = await User.findOne({ _id: req.params.id, role: 'rider' });

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'Rider not found.'
      });
    }

    rider.isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : !rider.isActive;
    await rider.save();

    return res.json({
      success: true,
      message: `Rider ${rider.name} is now ${rider.isActive ? 'Active' : 'Deactivated'}.`,
      isActive: rider.isActive
    });
  } catch (error) {
    console.error('[Admin Toggle Rider Status Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update rider active status.'
    });
  }
};

// @desc    Delete or decommission a rider
// @route   DELETE /api/admin/riders/:id
// @access  Private (Admin only)
export const deleteRider = async (req, res) => {
  try {
    const riderId = req.params.id;
    const rider = await User.findOne({ _id: riderId, role: 'rider' });

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'Rider not found.'
      });
    }

    // 1. Safely unassign rider from all non-delivered orders so no order is orphaned
    await Order.updateMany(
      {
        'logistics.assignedRider': rider._id,
        orderStatus: { $nin: ['DELIVERED', 'CANCELLED'] }
      },
      {
        $set: { 'logistics.assignedRider': null }
      }
    );

    // 2. Check if rider has completed historical deliveries
    const historicalDeliveries = await Order.countDocuments({
      'logistics.assignedRider': rider._id,
      orderStatus: 'DELIVERED'
    });

    if (historicalDeliveries > 0) {
      // Soft-deactivate to preserve historical integrity on delivered receipts
      rider.isActive = false;
      rider.name = `${rider.name} (Decommissioned)`;
      await rider.save();
      return res.json({
        success: true,
        message: `Rider has ${historicalDeliveries} completed deliveries on record. Account safely deactivated and active tasks unassigned.`
      });
    }

    // Clean delete if no historical deliveries exist
    await User.deleteOne({ _id: rider._id });

    return res.json({
      success: true,
      message: `Rider ${rider.name} archived successfully.`
    });
  } catch (error) {
    console.error('[Admin Delete Rider Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete rider.'
    });
  }
};

// ============================================================================
// 2. USERS & ADDRESSES DIRECTORY (REQUIREMENT #7.1)
// ============================================================================

// @desc    Get all registered customers with address count & lifetime metrics
// @route   GET /api/admin/users
// @access  Private (Admin only)
export const getAdminUsers = async (req, res) => {
  try {
    const { search, role, status } = req.query;
    const filter = {};

    if (role && role !== 'all') {
      filter.role = role;
    } else {
      filter.role = { $in: ['customer', 'admin', 'rider'] };
    }

    if (status === 'active') filter.isActive = true;
    if (status === 'deactivated') filter.isActive = false;

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ];
    }

    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });

    const usersWithStats = await Promise.all(
      users.map(async (u) => {
        const [totalOrders, spentAgg] = await Promise.all([
          Order.countDocuments({ customer: u._id }),
          Order.aggregate([
            {
              $match: {
                customer: u._id,
                $or: [{ 'payment.status': 'PAID' }, { orderStatus: 'DELIVERED' }]
              }
            },
            { $group: { _id: null, total: { $sum: '$pricingBreakdown.grandTotal' } } }
          ])
        ]);

        return {
          _id: u._id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role,
          isActive: u.isActive !== false,
          isPhoneVerified: Boolean(u.isPhoneVerified),
          addressesCount: (u.addresses || []).length,
          addresses: u.addresses || [],
          alternatePhones: u.alternatePhones || [],
          preferences: u.preferences,
          profileImage: u.profileImage,
          totalOrders,
          totalSpent: spentAgg[0]?.total || 0,
          createdAt: u.createdAt
        };
      })
    );

    return res.json({
      success: true,
      count: usersWithStats.length,
      users: usersWithStats,
      data: usersWithStats
    });
  } catch (error) {
    console.error('[Admin Get Users Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users directory.'
    });
  }
};

// @desc    Update customer/user account details
// @route   PUT /api/admin/users/:id
// @access  Private (Admin only)
export const updateAdminUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { name, email, role, isActive } = req.body;
    if (name && name.trim()) user.name = name.trim();
    if (role && ['customer', 'rider', 'admin'].includes(role)) user.role = role;
    if (isActive !== undefined) user.isActive = Boolean(isActive);

    if (email !== undefined) {
      const emailToSet = email ? email.trim().toLowerCase() : undefined;
      if (emailToSet && emailToSet !== user.email) {
        const existing = await User.findOne({ email: emailToSet, _id: { $ne: user._id } });
        if (existing) {
          return res.status(400).json({ success: false, message: 'Email address already in use.' });
        }
      }
      user.email = emailToSet;
    }

    await user.save();

    return res.json({
      success: true,
      message: 'User updated successfully.',
      user,
      data: user
    });
  } catch (error) {
    console.error('[Admin Update User Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update user.'
    });
  }
};

// @desc    Toggle customer active/blocked status
// @route   PATCH /api/admin/users/:id/status
// @access  Private (Admin only)
export const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : !user.isActive;
    await user.save();

    return res.json({
      success: true,
      message: `User account is now ${user.isActive ? 'Active' : 'Blocked'}.`,
      isActive: user.isActive
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update user status.' });
  }
};

// ============================================================================
// 3. CATEGORIES MANAGEMENT (REQUIREMENT #7.2)
// ============================================================================

// @desc    Get dynamic categories
// @route   GET /api/admin/categories
// @access  Private (Admin only)
export const getAdminCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ sortOrder: 1, name: 1 });
    return res.json({
      success: true,
      count: categories.length,
      categories,
      data: categories
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve categories.' });
  }
};

// @desc    Create new category
// @route   POST /api/admin/categories
// @access  Private (Admin only)
export const createAdminCategory = async (req, res) => {
  try {
    const { name, shortName, description, icon, sortOrder, isActive } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const existing = await Category.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A category with this name already exists.' });
    }

    const category = await Category.create({
      name: name.trim(),
      shortName: shortName?.trim() || '',
      description: description ? description.trim() : '',
      icon: icon || 'Shirt',
      sortOrder: Number(sortOrder) || 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    return res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      category,
      data: category
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to create category.' });
  }
};

// @desc    Update category
// @route   PUT /api/admin/categories/:id
// @access  Private (Admin only)
export const updateAdminCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    const { name, shortName, description, icon, sortOrder, isActive } = req.body;
    if (name && name.trim()) {
      category.legacyNames = [...new Set([...category.legacyNames, category.name])];
      category.name = name.trim();
    }
    if (shortName !== undefined) category.shortName = shortName.trim();
    if (description !== undefined) category.description = description.trim();
    if (icon) category.icon = icon;
    if (sortOrder !== undefined) category.sortOrder = Number(sortOrder);
    if (isActive !== undefined) category.isActive = Boolean(isActive);

    await category.save();

    return res.json({
      success: true,
      message: 'Category updated successfully.',
      category,
      data: category
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to update category.' });
  }
};

// @desc    Delete category
// @route   DELETE /api/admin/categories/:id
// @access  Private (Admin only)
export const deleteAdminCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    category.isActive = false;
    await category.save();

    return res.json({
      success: true,
      message: `Category "${category.name}" archived successfully.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete category.' });
  }
};

// ============================================================================
// 4. PAYMENTS & TRANSACTIONS LEDGER (REQUIREMENT #7.3)
// ============================================================================

// @desc    Get complete financial ledger & transactions with COD reconciliation metrics
// @route   GET /api/admin/payments
// @access  Private (Admin only)
export const getAdminPayments = async (req, res) => {
  try {
    const { status, method, search, reconciliationStatus } = req.query;
    const filter = {};

    if (status && status !== 'ALL') {
      filter['payment.status'] = status;
    }
    if (method && method !== 'ALL') {
      filter['payment.method'] = method;
    }
    if (reconciliationStatus && reconciliationStatus !== 'ALL') {
      filter['payment.reconciliationStatus'] = reconciliationStatus;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { orderNumber: { $regex: q, $options: 'i' } },
        { 'payment.transactionId': { $regex: q, $options: 'i' } },
        { 'payment.transactionReferenceId': { $regex: q, $options: 'i' } },
        { 'payment.razorpayOrderId': { $regex: q, $options: 'i' } },
        { 'payment.razorpayPaymentId': { $regex: q, $options: 'i' } }
      ];
    }

    const [orders, metrics] = await Promise.all([
      Order.find(filter)
        .populate('customer', 'name email phone')
        .populate('logistics.pickupRider logistics.deliveryRider logistics.assignedRider', 'name phone email riderDetails')
        .populate('payment.collectedBy payment.reconciledBy', 'name phone email')
        .select('orderNumber customer pricingBreakdown payment orderStatus logistics createdAt')
        .sort({ createdAt: -1 }),
      Order.aggregate([
        {
          $group: {
            _id: null,
            totalGross: { $sum: '$pricingBreakdown.grandTotal' },
            totalPaidRevenue: {
              $sum: {
                $cond: [{ $eq: ['$payment.status', 'PAID'] }, '$pricingBreakdown.grandTotal', 0]
              }
            },
            totalPendingCod: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$payment.method', 'COD'] },
                      { $ne: ['$payment.status', 'PAID'] },
                      { $ne: ['$orderStatus', 'CANCELLED'] }
                    ]
                  },
                  '$pricingBreakdown.grandTotal',
                  0
                ]
              }
            },
            totalPendingCashHandover: {
              $sum: {
                $cond: [
                  { $eq: ['$payment.reconciliationStatus', 'PENDING_CASH_HANDOVER'] },
                  { $ifNull: ['$payment.amountCollected', '$pricingBreakdown.grandTotal'] },
                  0
                ]
              }
            },
            pendingCashHandoverCount: {
              $sum: {
                $cond: [{ $eq: ['$payment.reconciliationStatus', 'PENDING_CASH_HANDOVER'] }, 1, 0]
              }
            },
            totalPendingUtrVerification: {
              $sum: {
                $cond: [
                  { $eq: ['$payment.reconciliationStatus', 'PENDING_UTR_VERIFICATION'] },
                  { $ifNull: ['$payment.amountCollected', '$pricingBreakdown.grandTotal'] },
                  0
                ]
              }
            },
            pendingUtrVerificationCount: {
              $sum: {
                $cond: [{ $eq: ['$payment.reconciliationStatus', 'PENDING_UTR_VERIFICATION'] }, 1, 0]
              }
            },
            totalReconciled: {
              $sum: {
                $cond: [
                  { $eq: ['$payment.reconciliationStatus', 'RECONCILED'] },
                  { $ifNull: ['$payment.amountCollected', '$pricingBreakdown.grandTotal'] },
                  0
                ]
              }
            },
            totalFailed: {
              $sum: {
                $cond: [{ $eq: ['$payment.status', 'FAILED'] }, 1, 0]
              }
            },
            totalRefunded: {
              $sum: {
                $cond: [{ $eq: ['$payment.status', 'REFUNDED'] }, '$pricingBreakdown.grandTotal', 0]
              }
            }
          }
        }
      ])
    ]);

    const summary = metrics[0] || {
      totalGross: 0,
      totalPaidRevenue: 0,
      totalPendingCod: 0,
      totalPendingCashHandover: 0,
      pendingCashHandoverCount: 0,
      totalPendingUtrVerification: 0,
      pendingUtrVerificationCount: 0,
      totalReconciled: 0,
      totalFailed: 0,
      totalRefunded: 0
    };

    // Normalize each order to support both frontend access patterns seamlessly
    const formattedOrders = orders.map((order) => {
      const doc = order.toObject();
      return {
        ...doc,
        paymentStatus: doc.payment?.status,
        paymentMethod: doc.payment?.method,
        paymentDetails: doc.payment,
        reconciliationStatus: doc.payment?.reconciliationStatus || 'NOT_APPLICABLE',
        pricingBreakdown: {
          ...doc.pricingBreakdown,
          finalPayable: doc.pricingBreakdown?.grandTotal || 0
        }
      };
    });

    return res.json({
      success: true,
      count: formattedOrders.length,
      summary,
      totalRevenue: summary.totalGross || 0,
      settledRevenue: summary.totalPaidRevenue || 0,
      pendingCodRevenue: summary.totalPendingCod || 0,
      failedRefundedRevenue: summary.totalRefunded || 0,
      pendingCashHandoverRevenue: summary.totalPendingCashHandover || 0,
      pendingCashHandoverCount: summary.pendingCashHandoverCount || 0,
      pendingUtrVerificationRevenue: summary.totalPendingUtrVerification || 0,
      pendingUtrVerificationCount: summary.pendingUtrVerificationCount || 0,
      totalReconciledRevenue: summary.totalReconciled || 0,
      transactions: formattedOrders,
      data: formattedOrders
    });
  } catch (error) {
    console.error('[Admin Get Payments Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payments ledger.'
    });
  }
};

// @desc    Reconcile payment status manually (COD collect, refund, retry capture, or UTR approval)
// @route   PATCH /api/admin/payments/:orderId
// @access  Private (Admin only)
export const updateAdminPaymentStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const { paymentStatus, transactionId, transactionReferenceId, reconciliationStatus, note } = req.body;
    const now = new Date();

    if (paymentStatus) {
      if (!['PAID', 'PENDING', 'FAILED', 'REFUNDED'].includes(paymentStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Valid paymentStatus (PAID, PENDING, FAILED, REFUNDED) is required.'
        });
      }
      order.payment.status = paymentStatus;
      if (paymentStatus === 'PAID' && !order.payment.paidAt) {
        order.payment.paidAt = now;
      }
    }

    if (transactionId) {
      order.payment.transactionId = transactionId;
    }

    if (transactionReferenceId) {
      order.payment.transactionReferenceId = String(transactionReferenceId).trim();
    }

    if (reconciliationStatus) {
      order.payment.reconciliationStatus = reconciliationStatus;
      order.payment.reconciledBy = req.user._id;
      order.payment.reconciledAt = now;
      if (reconciliationStatus === 'RECONCILED' && order.payment.status !== 'PAID') {
        order.payment.status = 'PAID';
        order.payment.paidAt = order.payment.paidAt || now;
      }
    }

    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: order.orderStatus,
      timestamp: now,
      updatedBy: req.user._id,
      updaterRole: 'admin',
      note: note || `Admin updated payment. Status: ${order.payment.status}, Reconciliation: ${order.payment.reconciliationStatus}`
    });

    await order.save();
    await order.populate('customer', 'name email phone');
    await order.populate('logistics.pickupRider logistics.deliveryRider logistics.assignedRider', 'name phone email riderDetails');
    await order.populate('payment.collectedBy payment.reconciledBy', 'name phone email');

    return res.json({
      success: true,
      message: `Payment reconciled for Order #${order.orderNumber}.`,
      order,
      data: order
    });
  } catch (error) {
    console.error('[Admin Reconcile Payment Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to reconcile payment.' });
  }
};

// @desc    Bulk reconcile cash handover from a rider
// @route   POST /api/admin/reconcile-rider-cash
// @access  Private (Admin only)
export const reconcileRiderCash = async (req, res) => {
  try {
    const { riderId, notes } = req.body;
    if (!riderId) {
      return res.status(400).json({ success: false, message: 'Rider ID is required.' });
    }

    const rider = await User.findById(riderId);
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider not found.' });
    }

    const pendingOrders = await Order.find({
      'payment.collectedBy': riderId,
      'payment.reconciliationStatus': 'PENDING_CASH_HANDOVER'
    });

    if (pendingOrders.length === 0) {
      return res.json({
        success: true,
        message: `No pending cash handover orders found for rider ${rider.name}.`,
        reconciledCount: 0,
        totalAmount: 0
      });
    }

    let totalAmount = 0;
    const now = new Date();

    for (const ord of pendingOrders) {
      const amt = ord.payment.amountCollected || ord.payment.codAmount || ord.pricingBreakdown?.grandTotal || 0;
      totalAmount += amt;
      ord.payment.reconciliationStatus = 'RECONCILED';
      ord.payment.reconciledBy = req.user._id;
      ord.payment.reconciledAt = now;
      ord.payment.reconciliationNotes = notes ? String(notes).trim() : `Bulk shift cash handover confirmed by Admin (${req.user.name || 'Admin'}).`;

      if (!ord.statusHistory) ord.statusHistory = [];
      ord.statusHistory.push({
        status: ord.orderStatus,
        timestamp: now,
        updatedBy: req.user._id,
        updaterRole: 'admin',
        note: `Cash handover reconciled: ₹${amt} collected by ${rider.name}`
      });

      await ord.save();
    }

    return res.json({
      success: true,
      message: `Successfully reconciled ₹${totalAmount} across ${pendingOrders.length} orders for rider ${rider.name}.`,
      reconciledCount: pendingOrders.length,
      totalAmount
    });
  } catch (error) {
    console.error('[Admin Bulk Reconcile Cash Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to reconcile rider cash handover.' });
  }
};

// ============================================================================
// 5. SYSTEM NOTIFICATIONS & ANNOUNCEMENTS (REQUIREMENT #7.4)
// ============================================================================

// @desc    Get sent notifications list
// @route   GET /api/admin/notifications
// @access  Private (Admin only)
export const getAdminNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .populate('recipient', 'name email phone')
      .populate('orderId', 'orderNumber orderStatus')
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({
      success: true,
      count: notifications.length,
      notifications,
      data: notifications
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve notifications.' });
  }
};

// @desc    Broadcast announcement or send targeted notification
// @route   POST /api/admin/notifications
// @access  Private (Admin only)
export const sendAdminNotification = async (req, res) => {
  try {
    const { title, message, type, recipientId, recipient, isBroadcast, orderId } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Notification title and message are required.'
      });
    }

    const targetUser = recipientId || recipient || null;
    const broadcast = Boolean(isBroadcast) || !targetUser;
    let orderNumber = '';

    if (orderId) {
      const ord = await Order.findById(orderId).select('orderNumber');
      if (ord) orderNumber = ord.orderNumber;
    }

    const notification = await Notification.create({
      recipient: broadcast ? null : targetUser,
      isBroadcast: broadcast,
      title: title.trim(),
      message: message.trim(),
      type: type && ['ORDER_UPDATE', 'RIDER_ASSIGNED', 'PROMO', 'SYSTEM_ALERT', 'GENERAL'].includes(type) ? type : 'GENERAL',
      orderId: orderId || null,
      orderNumber,
      isRead: false
    });

    return res.status(201).json({
      success: true,
      message: broadcast ? 'Broadcast announcement published to all customers.' : 'Notification sent to customer.',
      notification,
      data: notification
    });
  } catch (error) {
    console.error('[Admin Send Notification Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to send notification.' });
  }
};
