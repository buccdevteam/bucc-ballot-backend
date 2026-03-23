/**
 * Candidate Controller
 * Uses Cloudinary for photo uploads - no more base64 in JSON payloads.
 */

const Candidate = require("../models/Candidate");
const Category = require("../models/Category");
const { AppError } = require("../middleware/errorHandler");
const { deleteCandidatePhoto } = require("../config/cloudinary");
const catchAsync = require("../utils/catchAsync");

/**
 * @route   GET /api/candidates
 * @desc    Get all candidates (public endpoint)
 * @access  Public
 */
exports.getAllCandidates = catchAsync(async (req, res) => {
  const t0 = Date.now();
  const candidates = await Candidate.find()
    .populate("category", "title description allowAbstain isActive")
    .sort({ createdAt: -1 })
    .lean();
  const queryMs = Date.now() - t0;

  res.status(200).json({
    status: "success",
    results: candidates.length,
    data: {
      candidates,
    },
  });

  // Defer debug logging so it never blocks the response
  setImmediate(() => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1000);
      fetch(
        "http://127.0.0.1:7799/ingest/b081a051-05a3-4288-8ed4-9ae9e74f4251",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "aebaeb",
          },
          body: JSON.stringify({
            sessionId: "aebaeb",
            location: "candidateController.js:getAllCandidates",
            message: "Query complete",
            data: {
              queryMs,
              candidateCount: candidates.length,
              payloadKB: Math.round(JSON.stringify(candidates).length / 1024),
              hasBase64Photos: candidates.some(
                (c) =>
                  typeof c.photoURL === "string" &&
                  c.photoURL.startsWith("data:"),
              ),
            },
            timestamp: Date.now(),
            hypothesisId: "H-A,H-C",
          }),
          signal: controller.signal,
        },
      )
        .finally(() => clearTimeout(timeout))
        .catch(() => {});
    } catch (_) {}
  });
});

/**
 * @route   GET /api/candidates/category/:categoryId
 * @desc    Get candidates by category (public endpoint)
 * @access  Public
 */
exports.getCandidatesByCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.categoryId);

  if (!category) {
    return next(new AppError("No category found with that ID", 404));
  }

  const candidates = await Candidate.find({ category: req.params.categoryId })
    .populate("category", "title description allowAbstain")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: candidates.length,
    data: {
      category: {
        id: category._id,
        title: category.title,
        description: category.description,
        allowAbstain: category.allowAbstain,
      },
      candidates,
    },
  });
});

/**
 * @route   GET /api/admin/candidates
 * @desc    Get all candidates (admin)
 * @access  Private (Admin)
 */
exports.getAllCandidatesAdmin = catchAsync(async (req, res) => {
  const candidates = await Candidate.find()
    .populate("category", "title description")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: candidates.length,
    data: {
      candidates,
    },
  });
});

/**
 * @route   GET /api/admin/candidates/:id
 * @desc    Get single candidate
 * @access  Private (Admin)
 */
exports.getCandidate = catchAsync(async (req, res, next) => {
  const candidate = await Candidate.findById(req.params.id).populate(
    "category",
  );

  if (!candidate) {
    return next(new AppError("No candidate found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      candidate,
    },
  });
});

/**
 * @route   POST /api/admin/candidates
 * @desc    Create new candidate (multipart/form-data with photo file)
 * @access  Private (Admin)
 */
exports.createCandidate = catchAsync(async (req, res, next) => {
  const { name, manifesto, department, level, category } = req.body;

  if (!req.file || !req.file.path) {
    return next(new AppError("Please upload a photo for the candidate", 400));
  }

  if (!name || !manifesto || !department || !level || !category) {
    return next(
      new AppError(
        "Please provide all required fields: name, manifesto, department, level, category",
        400,
      ),
    );
  }

  const categoryExists = await Category.findById(category);
  if (!categoryExists) {
    return next(new AppError("Category not found", 404));
  }

  const candidate = await Candidate.create({
    name,
    photoURL: req.file.path,
    cloudinaryPublicId: req.file.filename,
    manifesto,
    department,
    level,
    category,
  });

  await candidate.populate("category", "title description");

  res.status(201).json({
    status: "success",
    data: {
      candidate,
    },
  });
});

/**
 * @route   PATCH /api/admin/candidates/:id
 * @desc    Update candidate (multipart/form-data, photo optional)
 * @access  Private (Admin)
 */
exports.updateCandidate = catchAsync(async (req, res, next) => {
  const candidate = await Candidate.findById(req.params.id);

  if (!candidate) {
    return next(new AppError("No candidate found with that ID", 404));
  }

  const updates = { ...req.body };
  delete updates.photoURL; // Never accept photoURL from body - use file upload only
  delete updates.cloudinaryPublicId;

  if (req.file && req.file.path) {
    // New photo uploaded - delete old Cloudinary image if it exists
    if (candidate.cloudinaryPublicId) {
      try {
        await deleteCandidatePhoto(candidate.cloudinaryPublicId);
      } catch (err) {
        console.error(
          "Failed to delete old candidate photo from Cloudinary:",
          err.message,
        );
      }
    }
    updates.photoURL = req.file.path;
    updates.cloudinaryPublicId = req.file.filename;
  }

  const updated = await Candidate.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  }).populate("category");

  res.status(200).json({
    status: "success",
    data: {
      candidate: updated,
    },
  });
});

/**
 * @route   DELETE /api/admin/candidates/:id
 * @desc    Delete candidate (also removes photo from Cloudinary if applicable)
 * @access  Private (Admin)
 */
exports.deleteCandidate = catchAsync(async (req, res, next) => {
  const candidate = await Candidate.findById(req.params.id);

  if (!candidate) {
    return next(new AppError("No candidate found with that ID", 404));
  }

  if (candidate.cloudinaryPublicId) {
    try {
      await deleteCandidatePhoto(candidate.cloudinaryPublicId);
    } catch (err) {
      console.error(
        "Failed to delete candidate photo from Cloudinary:",
        err.message,
      );
    }
  }

  await Candidate.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: "success",
    data: null,
  });
});
