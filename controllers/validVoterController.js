/**
 * Valid Voter Controller
 * Admin endpoints for managing the list of eligible voters by department
 */

const ValidVoter = require('../models/ValidVoter');
const { AppError } = require('../middleware/errorHandler');
const catchAsync = require('../utils/catchAsync');

/**
 * Parse CSV text into rows of objects
 * Expected format: matricNumber, name (header row optional)
 */
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];

  const rows = [];
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes('matric') || firstLine.includes('name');

  const startIndex = hasHeader ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    // Simple CSV parse - handle quoted values
    const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
    const matricNumber = parts[0]?.trim();
    if (!matricNumber) continue;

    rows.push({
      matricNumber: matricNumber.toUpperCase(),
      name: parts[1]?.trim() || '',
    });
  }

  return rows;
}

/**
 * @route   POST /api/admin/valid-voters/upload
 * @desc    Upload a list of valid voters for a department
 * @access  Private (Admin)
 */
exports.uploadValidVoters = catchAsync(async (req, res, next) => {
  const { department, data, voters } = req.body;

  if (!department || typeof department !== 'string') {
    return next(new AppError('Department name is required', 400));
  }

  const trimmedDept = department.trim();
  if (!trimmedDept) {
    return next(new AppError('Department name cannot be empty', 400));
  }

  let rows = [];

  if (Array.isArray(voters) && voters.length > 0) {
    // Pre-parsed from Excel (or JSON)
    rows = voters
      .filter((v) => v && (v.matricNumber || v.MatricNumber || v.matric_number))
      .map((v) => ({
        matricNumber: String(v.matricNumber || v.MatricNumber || v.matric_number || '').trim().toUpperCase(),
        name: String(v.name || v.Name || v.NAME || '').trim(),
      }))
      .filter((r) => r.matricNumber);
  } else if (data && typeof data === 'string') {
    // CSV text
    rows = parseCSV(data);
  }

  if (rows.length === 0) {
    return next(new AppError('No valid rows found. Expected format: matricNumber, name (CSV or Excel)', 400));
  }

  const toInsert = rows.map((r) => ({
    matricNumber: r.matricNumber,
    department: trimmedDept,
    name: r.name || undefined,
  }));

  // Use bulkWrite with upsert to avoid duplicates and handle updates
  const operations = toInsert.map((doc) => ({
    updateOne: {
      filter: { matricNumber: doc.matricNumber, department: trimmedDept },
      update: { $set: doc },
      upsert: true,
    },
  }));

  const result = await ValidVoter.bulkWrite(operations);

  res.status(200).json({
    status: 'success',
    data: {
      department: trimmedDept,
      uploaded: rows.length,
      inserted: result.upsertedCount || 0,
      modified: result.modifiedCount || 0,
    },
  });
});

/**
 * @route   GET /api/admin/valid-voters
 * @desc    Get list of valid voters, optionally filtered by department
 * @access  Private (Admin)
 */
exports.getValidVoters = catchAsync(async (req, res, next) => {
  const { department } = req.query;

  const filter = {};
  if (department && typeof department === 'string' && department.trim()) {
    filter.department = { $regex: new RegExp(`^${department.trim()}$`, 'i') };
  }

  const voters = await ValidVoter.find(filter)
    .sort({ department: 1, matricNumber: 1 })
    .lean();

  // Get unique departments for filter dropdown
  const departments = await ValidVoter.distinct('department');

  res.status(200).json({
    status: 'success',
    results: voters.length,
    data: {
      voters,
      departments,
    },
  });
});

/**
 * @route   DELETE /api/admin/valid-voters
 * @desc    Delete valid voters, optionally filtered by department
 * @access  Private (Admin)
 */
exports.deleteValidVoters = catchAsync(async (req, res, next) => {
  const { department } = req.query;

  const filter = {};
  if (department && typeof department === 'string' && department.trim()) {
    filter.department = { $regex: new RegExp(`^${department.trim()}$`, 'i') };
  } else {
    return next(new AppError('Department is required when deleting. Specify department to delete that department\'s list.', 400));
  }

  const result = await ValidVoter.deleteMany(filter);

  res.status(200).json({
    status: 'success',
    data: {
      deleted: result.deletedCount,
    },
  });
});
