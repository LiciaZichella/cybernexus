const express = require('express');
const { getMe, updateMe, getUserById, getAllUsers, changeUserRole, getMeActivity, getMeSubmissions, getMeAttempts, exportUsersCSV, getUserActivity, banUser } = require('../controllers/usersController');
const { protect, authorize } = require('../middleware/verificaUtenti');

const router = express.Router();


router.use(protect);

router.get('/me',              getMe);            
router.put('/me',              updateMe);         
router.get('/me/activity',    getMeActivity);    
router.get('/me/submissions', getMeSubmissions); 
router.get('/me/attempts',    getMeAttempts);    

router.get('/',            authorize('Admin'), getAllUsers);     
router.get('/export-csv', authorize('Admin'), exportUsersCSV); 


router.get('/:id/activity', getUserActivity);                        
router.get('/:id',        getUserById);                          
router.patch('/:id/role', authorize('Admin'), changeUserRole);   
router.patch('/:id/ban',  authorize('Admin'), banUser);          

module.exports = router;
