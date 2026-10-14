import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { verifyFirebaseIdToken } from '../utils/firebaseVerify.js';

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'indodhobi_super_secret_jwt_key_2026',
    { expiresIn: '30d' }
  );
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

    const phoneExists = await User.findOne({ phone });
    if (phoneExists) {
      return res.status(400).json({
        success: false,
        message: 'A user with this mobile phone number already exists.'
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      password,
      role: role && ['customer', 'rider', 'admin'].includes(role) ? role : 'customer'
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        addresses: user.addresses
      }
    });
  } catch (error) {
    console.error('[Register Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration.'
    });
  }
};

// @desc    Login user & get token
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

    const token = generateToken(user._id);

    return res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        addresses: user.addresses
      }
    });
  } catch (error) {
    console.error('[Login Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during login.'
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        addresses: user.addresses
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile.'
    });
  }
};

// @desc    Update user profile & address book
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

    if (req.body.name) user.name = req.body.name;
    if (req.body.phone) user.phone = req.body.phone;
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

    // If new address is supplied
    if (req.body.newAddress) {
      const { label, flatAndBuilding, streetAndLandmark, city, pincode, isDefault } = req.body.newAddress;
      
      if (isDefault) {
        user.addresses.forEach(addr => { addr.isDefault = false; });
      }

      user.addresses.push({
        label: label || 'Home',
        flatAndBuilding,
        streetAndLandmark,
        city: city || 'New Delhi',
        pincode,
        isDefault: Boolean(isDefault) || user.addresses.length === 0
      });
    }

    // If full addresses array is updated
    if (Array.isArray(req.body.addresses)) {
      user.addresses = req.body.addresses;
    }

    await user.save();

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        addresses: user.addresses
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update profile.'
    });
  }
};

// @desc    Add an address to customer address book
// @route   POST /api/auth/addresses
// @access  Private
export const addAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { label, flatAndBuilding, streetAndLandmark, city, pincode, isDefault } = req.body;

    if (!flatAndBuilding || !streetAndLandmark || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide flat/building, street/landmark, and pincode.'
      });
    }

    const shouldBeDefault = Boolean(isDefault) || user.addresses.length === 0;

    if (shouldBeDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    user.addresses.push({
      label: label && ['Home', 'Work', 'Other'].includes(label) ? label : 'Home',
      flatAndBuilding,
      streetAndLandmark,
      city: city || 'New Delhi',
      pincode,
      isDefault: shouldBeDefault
    });

    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Address added successfully.',
      addresses: user.addresses,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        addresses: user.addresses
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to add address.'
    });
  }
};

// @desc    Delete an address from customer address book
// @route   DELETE /api/auth/addresses/:addressId
// @access  Private
export const deleteAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { addressId } = req.params;
    const initialLength = user.addresses.length;
    user.addresses = user.addresses.filter((a) => a._id.toString() !== addressId.toString());

    if (user.addresses.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: 'Address not found in address book.'
      });
    }

    // If default address was deleted, set first remaining as default
    if (user.addresses.length > 0 && !user.addresses.some((a) => a.isDefault)) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    return res.json({
      success: true,
      message: 'Address deleted successfully.',
      addresses: user.addresses,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        addresses: user.addresses
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete address.'
    });
  }
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

    // Use verified phone number, or fallback to request phone if in simulation mode
    const verifiedPhone = verification.phone || (phone ? phone.replace(/\D/g, '').slice(-10) : null);
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

    let isNewUser = false;

    if (!user) {
      // Auto-create new customer account
      isNewUser = true;
      user = await User.create({
        name: (name && name.trim()) || 'IndoDhobi Customer',
        phone: verifiedPhone,
        role: 'customer',
        firebaseUid,
        isPhoneVerified: true
      });
    } else {
      // Update firebaseUid & phone verification status if needed
      let changed = false;
      if (firebaseUid && user.firebaseUid !== firebaseUid) {
        user.firebaseUid = firebaseUid;
        changed = true;
      }
      if (!user.isPhoneVerified) {
        user.isPhoneVerified = true;
        changed = true;
      }
      if (name && name.trim() && (user.name === 'IndoDhobi Customer' || !user.name)) {
        user.name = name.trim();
        changed = true;
      }
      if (changed) {
        await user.save();
      }
    }

    const token = generateToken(user._id);

    return res.json({
      success: true,
      token,
      isNewUser,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
        addresses: user.addresses
      }
    });
  } catch (error) {
    console.error('[Customer Firebase Login Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during customer phone verification.'
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

    const token = generateToken(user._id);

    return res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        addresses: user.addresses
      }
    });
  } catch (error) {
    console.error('[Staff Login Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during staff login.'
    });
  }
};
