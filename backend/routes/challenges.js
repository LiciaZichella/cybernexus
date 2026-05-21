const express   = require('express');
const rateLimit = require('express-rate-limit');
const {
  getChallenges,
  getChallengeById,
  createChallenge,
  submitFlag,
  getHint,
} = require('../controllers/challengesController');
const { protect, authorize } = require('../middleware/verificaUtenti');

const router = express.Router();

// Rate limiter specifico per la sottomissione flag: max 10 tentativi per 15 minuti per IP
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppi tentativi di flag. Riprova tra qualche minuto.' },
});

// Tutte le route richiedono autenticazione
router.use(protect);

router.get('/',    getChallenges);
router.post('/',   authorize('Admin', 'Manager'), createChallenge);

router.get('/:id',              getChallengeById);
router.post('/:id/submit',      submitLimiter, submitFlag);
router.get('/:id/hint',         getHint);

module.exports = router;
