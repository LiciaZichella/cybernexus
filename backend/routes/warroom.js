const express = require('express');
const {
  getWARRooms,
  getWARRoomById,
  createWARRoom,
  joinWARRoom,
  resolveWARRoom,
} = require('../controllers/warroomController');
const { protect, authorize } = require('../middleware/verificaUtenti');

const router = express.Router();

// Tutte le route richiedono autenticazione
router.use(protect);

router.get('/',    getWARRooms);
router.post('/',   authorize('Admin', 'Manager'), createWARRoom);

router.get('/:id',          getWARRoomById);
router.post('/:id/join',    joinWARRoom);
router.post('/:id/resolve', resolveWARRoom);

module.exports = router;
