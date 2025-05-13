const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middlewares/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Send a message
router.post('/send', messageController.sendMessage);

// Get queue statistics for all units
router.get('/queue', messageController.getQueueStats);

// Get queue statistics for a specific unit
router.get('/queue/:unitId', messageController.getQueueStats);

// Clear queue for a specific unit
router.delete('/queue/:unitId', messageController.clearQueue);

module.exports = router;