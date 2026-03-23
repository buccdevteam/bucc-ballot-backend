/**
 * Cloudinary configuration for candidate photo uploads.
 * Used to upload candidate photos instead of storing base64 in the database.
 */
require('dotenv').config();
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const CANDIDATE_PHOTO_FOLDER = 'ballot-candidates';

/**
 * Delete a Cloudinary asset by its public_id.
 * @param {string} publicId - Full public_id (e.g. "ballot-candidates/photo-1234567890")
 * @returns {Promise} Cloudinary API response
 */
async function deleteCandidatePhoto(publicId) {
  if (!publicId) return null;
  return cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}

module.exports = {
  cloudinary,
  CANDIDATE_PHOTO_FOLDER,
  deleteCandidatePhoto,
};
