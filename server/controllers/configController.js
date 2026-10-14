import PlatformConfig from '../models/PlatformConfig.js';
import TimeSlot from '../models/TimeSlot.js';
import Garment from '../models/Garment.js';
import Coupon from '../models/Coupon.js';
import { uploadImageToCloudinary } from '../utils/cloudinary.js';

// @desc    Get public bootstrap config, active slots, garments and active coupons
// @route   GET /api/config/public
// @access  Public
export const getPublicConfig = async (req, res) => {
  try {
    const [config, slots, garments, coupons] = await Promise.all([
      PlatformConfig.getOrCreateActiveConfig(),
      TimeSlot.find({ isActive: true }).sort({ sortOrder: 1, startHour: 1 }),
      Garment.find({ isActive: true }).sort({ category: 1, name: 1 }),
      Coupon.find({ isActive: true, expiresAt: { $gt: new Date() } }).select('-__v')
    ]);

    return res.json({
      success: true,
      config,
      slots,
      garments,
      coupons
    });
  } catch (error) {
    console.error('[Get Public Config Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve platform configuration.'
    });
  }
};

// @desc    Update platform configuration settings
// @route   PUT /api/config/settings
// @access  Private (Admin only)
export const updateConfigSettings = async (req, res) => {
  try {
    const config = await PlatformConfig.getOrCreateActiveConfig();

    const allowedFields = [
      'businessName',
      'gstin',
      'sacCode',
      'supportPhone',
      'freeDeliveryThreshold',
      'deliveryFee',
      'expressSurcharge',
      'gstPercentage',
      'minStandardTurnaroundHours',
      'detergentOptions',
      'packagingOptions',
      'serviceTypes',
      'ironingTiers'
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        config[field] = req.body[field];
      }
    });

    await config.save();

    return res.json({
      success: true,
      message: 'Platform configuration updated successfully.',
      config
    });
  } catch (error) {
    console.error('[Update Config Settings Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update platform configuration.'
    });
  }
};

// @desc    Get all time slots (including inactive)
// @route   GET /api/config/slots/all
// @access  Private (Admin only)
export const getAllSlots = async (req, res) => {
  try {
    const slots = await TimeSlot.find().sort({ sortOrder: 1, startHour: 1 });
    return res.json({
      success: true,
      slots
    });
  } catch (error) {
    console.error('[Get All Slots Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve time slots.'
    });
  }
};

// @desc    Create a new time slot
// @route   POST /api/config/slots
// @access  Private (Admin only)
export const createSlot = async (req, res) => {
  try {
    const { label, startHour, endHour, maxCapacity, sortOrder, isActive } = req.body;

    if (!label || label.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Time slot label is required.'
      });
    }

    if (startHour === undefined || endHour === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Start hour and end hour are required.'
      });
    }

    const existing = await TimeSlot.findOne({ label: label.trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A time slot with label "${label.trim()}" already exists.`
      });
    }

    const newSlot = await TimeSlot.create({
      label: label.trim(),
      startHour: Number(startHour),
      endHour: Number(endHour),
      maxCapacity: maxCapacity !== undefined ? Number(maxCapacity) : 15,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    return res.status(201).json({
      success: true,
      message: 'Time slot created successfully.',
      slot: newSlot
    });
  } catch (error) {
    console.error('[Create Slot Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create time slot.'
    });
  }
};

// @desc    Update a time slot
// @route   PUT /api/config/slots/:id
// @access  Private (Admin only)
export const updateSlot = async (req, res) => {
  try {
    const slot = await TimeSlot.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Time slot not found.'
      });
    }

    const { label, startHour, endHour, maxCapacity, sortOrder, isActive } = req.body;

    if (label !== undefined) slot.label = label.trim();
    if (startHour !== undefined) slot.startHour = Number(startHour);
    if (endHour !== undefined) slot.endHour = Number(endHour);
    if (maxCapacity !== undefined) slot.maxCapacity = Number(maxCapacity);
    if (sortOrder !== undefined) slot.sortOrder = Number(sortOrder);
    if (isActive !== undefined) slot.isActive = Boolean(isActive);

    await slot.save();

    return res.json({
      success: true,
      message: 'Time slot updated successfully.',
      slot
    });
  } catch (error) {
    console.error('[Update Slot Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update time slot.'
    });
  }
};

// @desc    Upload media to Cloudinary
// @route   POST /api/config/upload-image
// @access  Private (Admin & Rider)
export const uploadImage = async (req, res) => {
  try {
    const imagePayload = req.body.image || req.body.imageBase64 || req.body.file;
    const folder = req.body.folder || 'indodhobi';

    if (!imagePayload) {
      return res.status(400).json({
        success: false,
        message: 'Image data (Base64 or URL) is required.'
      });
    }

    const result = await uploadImageToCloudinary(imagePayload, folder);

    return res.json({
      success: true,
      imageUrl: result.imageUrl,
      publicId: result.publicId
    });
  } catch (error) {
    console.error('[Upload Image Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Image upload failed.'
    });
  }
};
