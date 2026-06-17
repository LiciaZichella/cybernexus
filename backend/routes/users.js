const express = require('express');
const { getMe, updateMe, getUserById, getAllUsers, changeUserRole, getMeActivity, getMeSubmissions, exportUsersCSV, getUserActivity } = require('../controllers/usersController');
const { protect, authorize } = require('../middleware/verificaUtenti');

const router = express.Router();

// Tutte le route richiedono autenticazione
router.use(protect);

router.get('/me',              getMe);            // profilo utente loggato
router.put('/me',              updateMe);         // aggiorna profilo utente loggato
router.get('/me/activity',    getMeActivity);    // heatmap 60 giorni
router.get('/me/submissions', getMeSubmissions); // submission corrette per grafico

router.get('/',            authorize('Admin'), getAllUsers);     // lista utenti — solo Admin
router.get('/export-csv', authorize('Admin'), exportUsersCSV); // export CSV — solo Admin

// :id dopo le route statiche per evitare che '/me' venga catturata come parametro
router.get('/:id/activity', getUserActivity);                        // heatmap + categorie profilo pubblico
router.get('/:id',        getUserById);                          // profilo pubblico per ID
router.patch('/:id/role', authorize('Admin'), changeUserRole);   // cambia ruolo — solo Admin

module.exports = router;
