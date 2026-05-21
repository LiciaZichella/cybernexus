const express = require('express');
const { register, login, refresh, logout } = require('../controllers/authController');
const { protect } = require('../middleware/verificaUtenti');

const router = express.Router();

router.post('/register', register);
router.post('/login',    login);
router.post('/refresh',  refresh);
router.post('/logout',   protect, logout); // protect: serve il token per invalidarlo

module.exports = router;
