import Garment from '../models/Garment.js';

// @desc    Get all active garments with optional category filter
// @route   GET /api/catalog/garments
// @access  Public
export const getGarments = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { isActive: true };

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

// @desc    Add or update garment pricing (Admin only)
// @route   POST /api/catalog/garments
// @access  Private/Admin
export const saveGarment = async (req, res) => {
  try {
    const { id, name, category, iconName, pricing, isActive } = req.body;

    if (!name || !category || !pricing) {
      return res.status(400).json({
        success: false,
        message: 'Name, category, and pricing are required.'
      });
    }

    let garment;
    if (id) {
      garment = await Garment.findByIdAndUpdate(
        id,
        { name, category, iconName, pricing, isActive: isActive !== undefined ? isActive : true },
        { new: true, runValidators: true }
      );
    } else {
      garment = await Garment.create({
        name,
        category,
        iconName: iconName || 'Shirt',
        pricing,
        isActive: isActive !== undefined ? isActive : true
      });
    }

    return res.status(200).json({
      success: true,
      message: id ? 'Garment updated successfully' : 'Garment created successfully',
      data: garment
    });
  } catch (error) {
    console.error('[Save Garment Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to save garment.'
    });
  }
};
