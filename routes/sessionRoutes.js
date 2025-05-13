const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { authenticateToken } = require('../middlewares/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Create a new WhatsApp session
router.post('/', sessionController.createSession);

// Get all WhatsApp sessions
router.get('/', sessionController.getAllSessions);

// Get a specific WhatsApp session
router.get('/:unitId', sessionController.getSessionByUnitId);

// Get QR code for a WhatsApp session
router.get('/:unitId/qr', sessionController.getSessionQR);

// Delete a WhatsApp session
router.delete('/:unitId', sessionController.deleteSession);

module.exports = router;