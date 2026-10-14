import Garment from '../models/Garment.js';

// @desc    Get all active garments with optional category filter
// @route   GET /api/catalog/garments
// @access  Public (or Admin with ?includeInactive=true)
export const getGarments = async (req, res) => {
  try {
    const { category, search, includeInactive } = req.query;
    const filter = {};

    if (includeInactive !== 'true') {
      filter.isActive = true;
    }

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const garments = await Garment.find(filter).sort({ category: 1, name: 1 });

    return res.json({
      success: true,
      count: garments.length,
      data: garments
    });
  } catch (error) {
    console.error('[Catalog Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve garment catalog.'
    });
  }
};

// @desc    Create a new garment (Admin only)
// @route   POST /api/catalog/garments
// @access  Private/Admin
export const createGarment = async (req, res) => {
  try {
    const { name, category, iconName, pricing, isActive } = req.body;

    if (!name || !category || !pricing) {
      return res.status(400).json({
        success: false,
        message: 'Name, category, and pricing are required.'
      });
    }

    const garment = await Garment.create({
      name,
      category,
      iconName: iconName || 'Shirt',
      pricing,
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    return res.status(201).json({
      success: true,
      message: 'Garment created successfully',
      data: garment
    });
  } catch (error) {
    console.error('[Create Garment Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create garment.'
    });
  }
};

// @desc    Update garment details, pricing, or status (Admin only)
// @route   PUT /api/catalog/garments/:id
// @access  Private/Admin
export const updateGarment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, iconName, pricing, isActive } = req.body;

    const garment = await Garment.findById(id);
    if (!garment) {
      return res.status(404).json({
        success: false,
        message: 'Garment not found.'
      });
    }

    if (name) garment.name = name;
    if (category) garment.category = category;
    if (iconName) garment.iconName = iconName;
    if (pricing) {
      garment.pricing = {
        washOnly: pricing.washOnly !== undefined ? Number(pricing.washOnly) : garment.pricing.washOnly,
        standardSteamIron: pricing.standardSteamIron !== undefined ? Number(pricing.standardSteamIron) : garment.pricing.standardSteamIron,
        crispStarchPress: pricing.crispStarchPress !== undefined ? Number(pricing.crispStarchPress) : garment.pricing.crispStarchPress,
        delicatePress: pricing.delicatePress !== undefined ? Number(pricing.delicatePress) : garment.pricing.delicatePress,
        dryClean: pricing.dryClean !== undefined ? Number(pricing.dryClean) : garment.pricing.dryClean
      };
    }
    if (isActive !== undefined) garment.isActive = Boolean(isActive);

    await garment.save();

    return res.status(200).json({
      success: true,
      message: 'Garment updated successfully',
      data: garment
    });
  } catch (error) {
    console.error('[Update Garment Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update garment.'
    });
  }
};

// @desc    Add or update garment pricing (Admin only - legacy support)
// @route   POST /api/catalog/garments
// @access  Private/Admin
export const saveGarment = async (req, res) => {
  if (req.body.id) {
    req.params = { id: req.body.id };
    return updateGarment(req, res);
  }
  return createGarment(req, res);
};
