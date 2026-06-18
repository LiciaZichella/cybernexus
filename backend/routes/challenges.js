const express   = require('express');
const rateLimit = require('express-rate-limit');
const {
  getChallenges,
  getChallengeById,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  submitFlag,
  getHint,
} = require('../controllers/challengesController');
const { protect, authorize } = require('../middleware/verificaUtenti');

const router = express.Router();


const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppi tentativi di flag. Riprova tra qualche minuto.' },
});


router.use(protect);

router.get('/',    getChallenges);
router.post('/',   authorize('Admin'), createChallenge);

router.get('/:id',              getChallengeById);
router.patch('/:id',            authorize('Admin'), updateChallenge);
router.delete('/:id',           authorize('Admin'), deleteChallenge);
router.post('/:id/submit',      submitLimiter, submitFlag);
router.get('/:id/hint',         getHint);

module.exports = router;
