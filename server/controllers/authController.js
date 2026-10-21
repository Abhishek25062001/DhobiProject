import PlatformConfig from '../models/PlatformConfig.js';
import { changeAddressBook, saveAddressInBook } from '../services/addressBook.js';
import User, { normalizePhone } from '../models/User.js';
import Order from '../models/Order.js';
import jwt from 'jsonwebtoken';
import { verifyFirebaseIdToken } from '../utils/firebaseVerify.js';
import { uploadImageToCloudinary } from '../utils/cloudinary.js';

const generateToken = (id, role = 'customer') => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

export const formatUser = (user) => {
  const avatarUrl = user?.profileImage?.url || user?.profileImage?.imageUrl || (typeof user?.profileImage === 'string' ? user.profileImage : '');
  return {
    _id: user._id,
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive !== false,
    isPhoneVerified: Boolean(user.isPhoneVerified),
    isProfileComplete: user.isProfileComplete !== false,
    profileImage: {
      url: avatarUrl,
      imageUrl: avatarUrl,
      publicId: user?.profileImage?.publicId || ''
    },
    alternatePhones: user.alternatePhones || [],
    preferences: user.preferences || { defaultDetergent: 'Standard', defaultPackaging: 'Folded' },
    addresses: user.addresses || [],
    riderDetails: user.riderDetails || null
  };
};

// @desc    Register a new customer/user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (name, email, phone, password).'
      });
    }

    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists.'
      });
    }

    const cleanPhone = normalizePhone(phone);
    const phoneExists = await User.findOne({ phone: cleanPhone });
    if (phoneExists) {
      return res.status(400).json({
        success: false,
        message: 'A user with this mobile phone number already exists.'
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone: cleanPhone,
      password,
      role: 'customer',
      isPhoneVerified: false,
      isProfileComplete: true
    });

    const token = generateToken(user._id, user.role);

    return res.status(201).json({
      success: true,
      token,
      user: formatUser(user)
    });
  } catch (error) {
    console.error('[Register Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration.'
    });
  }
};

// @desc    Login user & get token (automatic role-based response)
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated by the administrator.'
      });
    }

    const token = generateToken(user._id, user.role);

    return res.json({
      success: true,
      token,
      user: formatUser(user)
    });
  } catch (error) {
    console.error('[Login Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during login.'
    });
  }
};

// @desc    Get current user profile (minimal auth check)
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.json({
      success: true,
      user: formatUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile.'
    });
  }
};

// @desc    Get full user profile with order stats & recent history
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Aggregate user order stats
    const [totalOrders, activeOrders, completedOrders, spentAgg, recentOrders] = await Promise.all([
      Order.countDocuments({ customer: user._id }),
      Order.countDocuments({
        customer: user._id,
        orderStatus: { $nin: ['DELIVERED', 'CANCELLED'] }
      }),
      Order.countDocuments({ customer: user._id, orderStatus: 'DELIVERED' }),
      Order.aggregate([
        {
          $match: {
            customer: user._id,
            $or: [{ 'payment.status': 'PAID' }, { orderStatus: 'DELIVERED' }]
          }
        },
        { $group: { _id: null, total: { $sum: '$pricingBreakdown.grandTotal' } } }
      ]),
      Order.find({ customer: user._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('items.garment', 'name category iconName')
        .select('orderNumber orderStatus pricingBreakdown pickupSchedule deliverySchedule createdAt payment items logistics')
    ]);

    const totalSpent = spentAgg[0]?.total || 0;

    return res.json({
      success: true,
      user: formatUser(user),
      stats: {
        totalOrders,
        activeOrders,
        completedOrders,
        totalSpent
      },
      recentOrders
    });
  } catch (error) {
    console.error('[Get Full Profile Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve user profile.'
    });
  }
};

// @desc    Update user profile & preferences (phone is immutable)
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Explicitly block/reject any attempt to change primary phone number
    if (req.body.phone && normalizePhone(req.body.phone) !== user.phone) {
      return res.status(400).json({
        success: false,
        message: 'Primary phone number is linked to your authentication identity and cannot be changed.'
      });
    }

    if (req.body.name && req.body.name.trim()) {
      user.name = req.body.name.trim();
    }

    if (req.body.email !== undefined) {
      const emailToSet = req.body.email ? req.body.email.trim().toLowerCase() : undefined;
      if (emailToSet && emailToSet !== user.email) {
        const existingUser = await User.findOne({ email: emailToSet, _id: { $ne: user._id } });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'A user with this email address already exists.'
          });
        }
      }
      user.email = emailToSet;
    }

    // Preferences reference the active booking configuration; an empty selection clears a default.
    if (req.body.preferences) {
      const config = await PlatformConfig.findOne();
      if (!user.preferences) user.preferences = {};
      for (const [key, list] of [['defaultDetergent', 'detergentOptions'], ['defaultPackaging', 'packagingOptions']]) {
        if (req.body.preferences[key] === undefined) continue;
        const value = req.body.preferences[key];
        if (typeof value !== 'string' || (value && !config?.[list].some(option => option.isActive && option.code === value))) return res.status(400).json({ success: false, message: 'Choose an available care preference, or clear the saved default.' });
        user.preferences[key] = value;
      }
    }

    if (req.body.newAddress !== undefined || req.body.addresses !== undefined) {
      return res.status(400).json({ success: false, message: 'Use Manage Addresses to change your saved addresses.' });
    }

    await user.save();

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: formatUser(user)
    });
  } catch (error) {
    console.error('[Update Profile Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update profile.'
    });
  }
};

// @desc    Upload user profile avatar to Cloudinary
// @route   POST /api/auth/profile/avatar
// @access  Private
export const uploadAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const imagePayload = req.body.imageBase64 || req.body.image || req.body.file;
    if (!imagePayload) {
      return res.status(400).json({
        success: false,
        message: 'Image data (Base64 data URI or URL) is required.'
      });
    }

    const uploadRes = await uploadImageToCloudinary(imagePayload, 'indodhobi/avatars');
    const avatarUrl = uploadRes.url || uploadRes.imageUrl;
    user.profileImage = {
      url: avatarUrl,
      imageUrl: avatarUrl,
      publicId: uploadRes.publicId || ''
    };

    await user.save();

    return res.json({
      success: true,
      message: 'Profile photo updated successfully.',
      url: avatarUrl,
      imageUrl: avatarUrl,
      publicId: uploadRes.publicId || '',
      profileImage: user.profileImage,
      user: formatUser(user)
    });
  } catch (error) {
    console.error('[Upload Avatar Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload profile photo.'
    });
  }
};

// @desc    Add an alternate phone number to user profile
// @route   POST /api/auth/profile/phones
// @access  Private
export const addAlternatePhone = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const rawNumber = req.body.number || req.body.phone;
    if (!rawNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required.'
      });
    }

    const cleanNumber = normalizePhone(rawNumber);
    if (cleanNumber.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit mobile number.'
      });
    }

    if (cleanNumber === user.phone) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add your primary phone number as an alternate phone.'
      });
    }

    if (!user.alternatePhones) {
      user.alternatePhones = [];
    }

    if (user.alternatePhones.some((p) => p.number === cleanNumber)) {
      return res.status(400).json({
        success: false,
        message: 'This alternate phone number is already added.'
      });
    }

    const label = (req.body.label && req.body.label.trim()) || 'Alternate';
    user.alternatePhones.push({
      number: cleanNumber,
      label,
      addedAt: new Date()
    });

    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Alternate phone number added successfully.',
      alternatePhones: user.alternatePhones,
      user: formatUser(user)
    });
  } catch (error) {
    console.error('[Add Alternate Phone Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to add alternate phone number.'
    });
  }
};

// @desc    Delete an alternate phone number from user profile
// @route   DELETE /api/auth/profile/phones/:phoneId
// @access  Private
export const deleteAlternatePhone = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { phoneId } = req.params;
    const initialLength = (user.alternatePhones || []).length;
    user.alternatePhones = (user.alternatePhones || []).filter(
      (p) => p._id.toString() !== phoneId.toString()
    );

    if (user.alternatePhones.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: 'Alternate phone number not found.'
      });
    }

    await user.save();

    return res.json({
      success: true,
      message: 'Alternate phone number deleted successfully.',
      alternatePhones: user.alternatePhones,
      user: formatUser(user)
    });
  } catch (error) {
    console.error('[Delete Alternate Phone Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete alternate phone number.'
    });
  }
};

// @desc    Add an address to customer address book
// @route   POST /api/auth/addresses
// @access  Private
const addressResponse = (res, user, message, status = 200) => res.status(status).json({ success: true, message, addresses: user.addresses, user: formatUser(user) });
const addressFailure = (res, error) => res.status(error.statusCode || (error.name === 'ValidationError' ? 400 : 500)).json({ success: false, message: error.message || 'Could not update your address book.' });

export const addAddress = async (req, res) => {
  try {
    const user = await changeAddressBook(req.user._id, user => saveAddressInBook(user, req.body));
    return addressResponse(res, user, 'Address saved successfully.', 201);
  } catch (error) { return addressFailure(res, error); }
};

export const updateAddress = async (req, res) => {
  try {
    const user = await changeAddressBook(req.user._id, user => saveAddressInBook(user, req.body, req.params.addressId));
    return addressResponse(res, user, 'Address updated successfully.');
  } catch (error) { return addressFailure(res, error); }
};

export const deleteAddress = async (req, res) => {
  try {
    const user = await changeAddressBook(req.user._id, user => {
      const address = user.addresses.id(req.params.addressId);
      if (!address) throw Object.assign(new Error('Address not found in your address book.'), { statusCode: 404 });
      address.deleteOne();
      const defaultId = user.addresses.find(item => item.isDefault)?._id || user.addresses[0]?._id;
      user.addresses.forEach(item => { item.isDefault = String(item._id) === String(defaultId); });
    });
    return addressResponse(res, user, 'Address deleted successfully.');
  } catch (error) { return addressFailure(res, error); }
};

// @desc    Customer login / auto-onboard via Firebase Phone OTP
// @route   POST /api/auth/customer/firebase-login
// @access  Public
export const customerFirebaseLogin = async (req, res) => {
  try {
    const { idToken, name, phone } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Firebase ID Token is required.'
      });
    }

    const verification = await verifyFirebaseIdToken(idToken);
    if (!verification.success) {
      return res.status(401).json({
        success: false,
        message: verification.message || 'Firebase authentication failed.'
      });
    }

    // Normalized 10-digit phone number
    const verifiedPhone = verification.phone || (phone ? normalizePhone(phone) : null);
    if (!verifiedPhone) {
      return res.status(400).json({
        success: false,
        message: 'No verified phone number found in Firebase token.'
      });
    }

    const firebaseUid = verification.uid;

    // Search by phone or firebaseUid
    let user = await User.findOne({
      $or: [
        { phone: verifiedPhone },
        ...(firebaseUid ? [{ firebaseUid }] : [])
      ]
    });

    if (user && user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated by the administrator.'
      });
    }

    // Handle new vs returning user
    if (!user) {
      // First-time customer: create record
      const providedName = (name && name.trim()) || '';
      const isComplete = Boolean(providedName && providedName !== 'IndoDhobi Customer');

      user = await User.create({
        name: isComplete ? providedName : 'IndoDhobi Customer',
        phone: verifiedPhone,
        role: 'customer',
        firebaseUid,
        isPhoneVerified: true,
        isProfileComplete: isComplete
      });

      const token = generateToken(user._id, user.role);

      return res.json({
        success: true,
        isNewUser: true,
        requiresName: !isComplete,
        tempToken: token,
        token,
        phone: verifiedPhone,
        user: formatUser(user)
      });
    }

    // Returning user
    let changed = false;
    if (firebaseUid && user.firebaseUid !== firebaseUid) {
      user.firebaseUid = firebaseUid;
      changed = true;
    }
    if (!user.isPhoneVerified) {
      user.isPhoneVerified = true;
      changed = true;
    }

    // If name was explicitly passed in body, apply it
    if (name && name.trim() && (user.name === 'IndoDhobi Customer' || !user.name || !user.isProfileComplete)) {
      user.name = name.trim();
      user.isProfileComplete = true;
      changed = true;
    }

    if (changed) {
      await user.save();
    }

    const hasValidName = Boolean(user.name && user.name.trim() !== '' && user.name !== 'IndoDhobi Customer');
    const isReturningComplete = hasValidName && user.isProfileComplete !== false;

    const token = generateToken(user._id, user.role);

    return res.json({
      success: true,
      isNewUser: !isReturningComplete,
      requiresName: !isReturningComplete,
      tempToken: token,
      token,
      phone: verifiedPhone,
      user: formatUser(user)
    });
  } catch (error) {
    console.error('[Customer Firebase Login Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during customer phone verification.'
    });
  }
};

// @desc    Complete profile onboarding (Step 3: Name & Email)
// @route   POST /api/auth/complete-onboarding
// @access  Private
export const completeOnboarding = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { name, email } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your full name to complete onboarding.'
      });
    }

    user.name = name.trim();
    user.isProfileComplete = true;

    if (email && email.trim()) {
      const emailToSet = email.trim().toLowerCase();
      const existingUser = await User.findOne({ email: emailToSet, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'A user with this email address already exists.'
        });
      }
      user.email = emailToSet;
    }

    await user.save();

    const token = generateToken(user._id, user.role);

    return res.json({
      success: true,
      message: 'Profile completed successfully! Welcome to IndoDhobi.',
      token,
      user: formatUser(user)
    });
  } catch (error) {
    console.error('[Complete Onboarding Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to complete profile onboarding.'
    });
  }
};

// @desc    Staff Login (Admin & Rider) via Email + Password
// @route   POST /api/auth/staff/login
// @access  Public
export const staffLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid staff credentials.'
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated by the administrator.'
      });
    }

    // Reject customers attempting to login via staff portal
    if (user.role === 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Customers must sign in using Mobile Number & SMS OTP.'
      });
    }

    // Verify role is staff (admin or rider)
    if (!['admin', 'rider'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access restricted to authorized staff only.'
      });
    }

    if (!(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid staff credentials.'
      });
    }

    const token = generateToken(user._id, user.role);

    return res.json({
      success: true,
      token,
      user: formatUser(user)
    });
  } catch (error) {
    console.error('[Staff Login Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during staff login.'
    });
  }
};

export default {
  register,
  login,
  getMe,
  getProfile,
  updateProfile,
  uploadAvatar,
  addAlternatePhone,
  deleteAlternatePhone,
  addAddress,
  updateAddress,
  deleteAddress,
  customerFirebaseLogin,
  completeOnboarding,
  staffLogin
};
