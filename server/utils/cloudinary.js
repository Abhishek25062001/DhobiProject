import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();


/**
 * Ensures Cloudinary SDK has latest env vars even if imported before dotenv.config() in entrypoint
 * @returns {boolean} Whether valid credentials exist
 */
export const ensureCloudinaryConfigured = () => {
  dotenv.config();
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLAUDINARY_CLOUD_NAME || '';
  const apiKey = process.env.CLOUDINARY_API_KEY || process.env.CLAUDINARY_API_KEY || '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.CLAUDINARY_API_SECRET || '';
  const cloudinaryUrl = process.env.CLOUDINARY_URL || process.env.CLAUDINARY_URL || '';

  if (cloudinaryUrl) {
    try {
      const parsed = new URL(cloudinaryUrl);
      if (parsed.protocol !== 'cloudinary:' || !parsed.hostname || !parsed.username || !parsed.password) return false;
      cloudinary.config({ cloud_name: parsed.hostname, api_key: decodeURIComponent(parsed.username), api_secret: decodeURIComponent(parsed.password), secure: true });
      return true;
    } catch { return false; }
  }

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });
    return true;
  }

  return false;
};

// Initial config check on file load
ensureCloudinaryConfigured();

// Accept uploaded raster files only; never fetch a caller-provided URL or file path.
export function validateImageInput(input) {
  const match = typeof input === 'string' && /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(input);
  if (!match) throw Object.assign(new Error('Upload a PNG, JPEG or WebP image.'), { statusCode: 400 });
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > 6 * 1024 * 1024) throw Object.assign(new Error('Images must be 6 MB or smaller.'), { statusCode: 413 });
  const valid = match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) :
    match[1] === 'jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 :
    bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!valid || bytes.length < 20) throw Object.assign(new Error('The file does not match its image type.'), { statusCode: 400 });
  return { bytes: bytes.length, mimeType: `image/${match[1]}` };
}

export const uploadImageToCloudinary = async (input, folder = 'indodhobi') => {
  const metadata = validateImageInput(input);
  if (!/^indodhobi(?:\/[a-z0-9_-]+)*$/.test(folder)) throw Object.assign(new Error('Invalid image destination.'), { statusCode: 400 });
  if (!ensureCloudinaryConfigured()) throw Object.assign(new Error('Image storage is unavailable. Configure Cloudinary before uploading.'), { statusCode: 503 });
  try {
    const result = await cloudinary.uploader.upload(input, {
      folder, resource_type: 'image', transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    });
    if (!result.secure_url?.startsWith('https://') || !result.public_id) throw new Error('Invalid storage response');
    return { url: result.secure_url, imageUrl: result.secure_url, publicId: result.public_id,
      width: result.width, height: result.height, ...metadata };
  } catch {
    throw Object.assign(new Error('Image upload failed. The existing image has been kept. Please try again.'), { statusCode: 503 });
  }
};

export { cloudinary };
export default uploadImageToCloudinary;
