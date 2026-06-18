const express = require('express');
const {
  getWARRooms,
  getWARRoomById,
  createWARRoom,
  saveDraft,
  updateStatus,
  joinWARRoom,
  resolveWARRoom,
  patchTask,
  getReport,
  markStep,
  deleteWARRoom,
} = require('../controllers/warroomController');
const { protect, authorize } = require('../middleware/verificaUtenti');

const router = express.Router();


router.use(protect);

router.get('/',     getWARRooms);
router.post('/',    authorize('Admin'), createWARRoom);
router.post('/draft', authorize('Admin'), saveDraft);

router.get('/:id',               getWARRoomById);
router.get('/:id/report',        getReport);
router.post('/:id/join',         joinWARRoom);

router.post('/:id/resolve',      resolveWARRoom);
router.patch('/:id/status',      authorize('Admin'), updateStatus);
router.patch('/:id/step',        markStep);
router.patch('/:id/task/:taskId', patchTask);
router.delete('/:id',            authorize('Admin'), deleteWARRoom);

module.exports = router;
