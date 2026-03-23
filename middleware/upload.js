/**
 * Multer middleware that streams uploads directly to Cloudinary.
 * No base64 or large JSON payloads - photos are uploaded as multipart/form-data
 * and stored in Cloudinary; only the secure_url is saved in MongoDB.
 */
const multer = require('multer');
const { cloudinary, CANDIDATE_PHOTO_FOLDER } = require('../config/cloudinary');

function fileFilter(req, file, cb) {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'));
  }
  cb(null, true);
}

const upload = multer({
  storage: {
    _handleFile(req, file, cb) {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: CANDIDATE_PHOTO_FOLDER,
          resource_type: 'image',
          public_id: `candidate-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        },
        (err, result) => {
          if (err) return cb(err);
          if (!result) return cb(new Error('No result from Cloudinary'));
          cb(null, {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: result.bytes,
            filename: result.public_id,
            path: result.secure_url,
          });
        }
      );
      file.stream.pipe(stream);
    },
    _removeFile(req, file, cb) {
      cb(null);
    },
  },
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = { upload };
