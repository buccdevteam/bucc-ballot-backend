/**
 * Valid Voter Routes (Admin)
 */

const express = require('express');
const {
  uploadValidVoters,
  getValidVoters,
  deleteValidVoters,
} = require('../controllers/validVoterController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin', 'super-admin'));

router.post('/upload', uploadValidVoters);
router.get('/', getValidVoters);
router.delete('/', deleteValidVoters);

module.exports = router;
