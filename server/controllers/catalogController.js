import { publicCategory } from '../services/publicProjection.js';
import Garment from '../models/Garment.js';
import Category from '../models/Category.js';
import { applyProductMedia } from '../services/media.js';
import { catalogRecords, serializeGarment, resolveCategory } from '../services/catalog.js';

const detailFields = ['shortName', 'description', 'sortOrder', 'allowedServices', 'allowedIroningTiers'];
const garmentDetails = body => Object.fromEntries(detailFields.filter(key => body[key] !== undefined).map(key => [key, body[key]]));

// @desc    Get all active garments with optional category filter
// @route   GET /api/catalog/garments
// @access  Public (or Admin with ?includeInactive=true)
export const getGarments = async (req, res) => {
  try {
    const { category, search, includeInactive } = req.query;
    const garments = await catalogRecords({ category, search, includeInactive: includeInactive === 'true' });

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
    const { name, category, iconName, pricing, isActive, imageUrl, cloudinaryPublicId, imageBase64 } = req.body;

    if (!name || (!category && !req.body.categoryId) || !pricing) {
      return res.status(400).json({
        success: false,
        message: 'Name, category, and pricing are required.'
      });
    }

    const categoryRecord = await resolveCategory(req.body);
    const garment = new Garment({
      ...garmentDetails(req.body),
      name,
      category: categoryRecord.name,
      categoryId: categoryRecord._id,
      iconName: iconName || 'Shirt',

      pricing,
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    await garment.validate();
    await applyProductMedia(garment, req.body);
    await garment.save();

    return res.status(201).json({
      success: true,
      message: 'Garment created successfully',
      data: await serializeGarment(garment, [categoryRecord])
    });
  } catch (error) {
    console.error('[Create Garment Error]:', error.message);
    return res.status(error.statusCode || 400).json({
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
    const { name, category, iconName, pricing, isActive, imageUrl, cloudinaryPublicId, imageBase64 } = req.body;

    const garment = await Garment.findById(id);
    if (!garment) {
      return res.status(404).json({
        success: false,
        message: 'Garment not found.'
      });
    }

    if (name) garment.name = name;
    Object.assign(garment, garmentDetails(req.body));
    const categoryRecord = await resolveCategory(req.body, garment);
    garment.category = categoryRecord.name;
    garment.categoryId = categoryRecord._id;
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

    await garment.validate();
    await applyProductMedia(garment, req.body);
    await garment.save();

    return res.status(200).json({
      success: true,
      message: 'Garment updated successfully',
      data: await serializeGarment(garment, [categoryRecord])
    });
  } catch (error) {
    console.error('[Update Garment Error]:', error.message);
    return res.status(error.statusCode || 400).json({
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

// @desc    Get all active categories
// @route   GET /api/catalog/categories
// @access  Public
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    return res.json({
      success: true,
      count: categories.length,
      data: categories.map(publicCategory)
    });
  } catch (error) {
    console.error('[Get Categories Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve categories'
    });
  }
};

