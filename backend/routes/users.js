const express = require('express');
const { getMe, updateMe, getUserById, getAllUsers } = require('../controllers/usersController');
const { protect, authorize } = require('../middleware/verificaUtenti');

const router = express.Router();

// Tutte le route richiedono autenticazione
router.use(protect);

router.get('/me',  getMe);           // profilo utente loggato
router.put('/me',  updateMe);        // aggiorna profilo utente loggato

router.get('/',    authorize('Admin'), getAllUsers);  // lista utenti — solo Admin

// :id dopo le route statiche per evitare che '/me' venga catturata come parametro
router.get('/:id', getUserById);     // profilo pubblico per ID

module.exports = router;
