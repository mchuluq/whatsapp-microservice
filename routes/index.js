const express = require('express');
const router = express.Router();
const sessionRoutes = require('./sessionRoutes');
const messageRoutes = require('./messageRoutes');

// Health check endpoint (no authentication required)
router.get('/health', (req, res) => {
	res.status(200).json({
		status: 'ok',
		service: 'whatsapp-bulk-sender',
		timestamp: new Date().toISOString()
	});
});

// API documentation endpoint (no authentication required)
router.get('/', (req, res) => {
	res.status(200).json({
		name: 'WhatsApp Bulk Sender API',
		version: '1.0.0',
		description: 'API for sending bulk WhatsApp messages',
		endpoints: {
			'/api/health': 'Health check endpoint',
			'/api/sessions': 'WhatsApp session management',
			'/api/messages': 'WhatsApp message sending and queue management'
		}
	});
});

// Mount routes
router.use('/sessions', sessionRoutes);
router.use('/messages', messageRoutes);

module.exports = router;