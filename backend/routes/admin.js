const express = require('express');
const { getStats, getActivity } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/verificaUtenti');

const router = express.Router();
router.use(protect);

router.get('/stats',    authorize('Admin'), getStats);
router.get('/activity', authorize('Admin'), getActivity);

module.exports = router;
