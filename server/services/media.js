import mongoose from 'mongoose';
import MediaAsset from '../models/MediaAsset.js';
import Garment from '../models/Garment.js';
import PlatformConfig from '../models/PlatformConfig.js';
import { uploadImageToCloudinary } from '../utils/cloudinary.js';

export function publicMedia(asset) {
  if (!asset || asset.status !== 'ready') return null;
  const { _id, url, defaultAlt, width, height, crop, version } = asset;
  return { _id, url, defaultAlt, width, height, crop, version };
}

export async function uploadMedia(input, { name = 'Uploaded image', defaultAlt = '', scope = 'website' } = {}) {
  const uploaded = await uploadImageToCloudinary(input, scope === 'inspection' ? 'indodhobi/inspections' : 'indodhobi/website');
  return MediaAsset.create({ ...uploaded, name, defaultAlt, provider: 'cloudinary', scope });
}

export async function checkMediaReference(reference) {
  if (reference === null) return null;
  if (!reference || !mongoose.isValidObjectId(reference.assetId)) throw Object.assign(new Error('Select an image from the media library.'), { statusCode: 400 });
  const asset = await MediaAsset.findOne({ _id: reference.assetId, status: 'ready', scope: 'website' });
  if (!asset) throw Object.assign(new Error('This image is no longer available.'), { statusCode: 400 });
  return { assetId: asset._id, ...(reference.alt !== undefined ? { alt: reference.alt } : {}), decorative: Boolean(reference.decorative) };
}

export async function mediaUsage(asset) {
  const [products, pages, qr] = await Promise.all([
    Garment.countDocuments({ $or: [{ 'primaryImage.assetId': asset._id }, { 'gallery.assetId': asset._id }] }),
    mongoose.connection.collection('sitecontents').countDocuments({ mediaAssetIds: asset._id }),
    PlatformConfig.countDocuments({ 'companyPaymentConfig.officialQrImageUrl': asset.url }),
  ]);
  return products + pages + qr;
}

export async function applyProductMedia(garment, body) {
  if (body.primaryImage !== undefined) garment.primaryImage = await checkMediaReference(body.primaryImage);
  else if (body.imageBase64) {
    const asset = await uploadMedia(body.imageBase64, { name: garment.name });
    garment.primaryImage = { assetId: asset._id };
  } else if (body.imageUrl !== undefined) {
    if (!body.imageUrl) garment.primaryImage = null;
    else if (body.imageUrl !== garment.imageUrl || !garment.primaryImage) {
      if (!/^https:\/\/[^\s]+$/.test(body.imageUrl)) throw Object.assign(new Error('Image links must use HTTPS.'), { statusCode: 400 });
      const asset = await MediaAsset.create({ name: garment.name, provider: 'external', url: body.imageUrl });
      garment.primaryImage = { assetId: asset._id };
    }
  }
  if (body.gallery !== undefined) {
    if (!Array.isArray(body.gallery) || body.gallery.length > 10) throw Object.assign(new Error('A gallery can contain up to 10 images.'), { statusCode: 400 });
    garment.gallery = await Promise.all(body.gallery.map(checkMediaReference));
    if (garment.gallery.some(ref => !ref)) throw Object.assign(new Error('Remove empty gallery entries.'), { statusCode: 400 });
  }
  if (garment.primaryImage === null) { garment.imageUrl = ''; garment.cloudinaryPublicId = ''; }
  else if (garment.primaryImage?.assetId) {
    const asset = await MediaAsset.findById(garment.primaryImage.assetId);
    garment.imageUrl = asset.url;
    garment.cloudinaryPublicId = asset.publicId || '';
  }
}
