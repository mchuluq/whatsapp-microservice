const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const { whatsappLogger } = require('../utils/logger');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');

// Store active WhatsApp sessions
const sessions = new Map();

// Store QR codes for sessions that are being created
const qrCodes = new Map();

/**
 * Restore WhatsApp sessions from the data path
 * @returns {Promise<void>}
 */
async function restoreSessions() {
	const basePath = config.whatsapp.dataPath;
	if (!fs.existsSync(basePath)) return;

	const unitDirs = fs.readdirSync(basePath, { withFileTypes: true })
		.filter(dirent => dirent.isDirectory())
		.map(dirent => dirent.name);

	for (const unitId of unitDirs) {
		await createSession(unitId);
	}
}


/**
 * Create a new WhatsApp session for a unitId
 * @param {string} unitId Unique identifier for the session
 * @returns {Promise<Object>} Session details
 */
const createSession = async (unitId) => {
	// Check if session already exists
	if (sessions.has(unitId)) {
		const existingSession = sessions.get(unitId);
			// Jika session sudah ada dan statusnya 'ready' atau 'authenticated', 
			// kembalikan session yang ada
			if (['ready', 'authenticated'].includes(existingSession.status)) {
					return {
							id: existingSession.id,
							unit_id: unitId,
							status: existingSession.status
					};
			}
				
			// Jika session ada tapi statusnya tidak aktif, hapus dan buat ulang
			await deleteSession(unitId);
	}

	// Create session data directory if it doesn't exist
	const sessionDir = path.join(config.whatsapp.dataPath, unitId);
	if (!fs.existsSync(sessionDir)) {
		fs.mkdirSync(sessionDir, { recursive: true });
	}

	// Generate a unique session ID
	const sessionId = uuidv4();

	const sessionPath = path.join(config.whatsapp.dataPath,unitId);
	if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

	// Create a new WhatsApp client
	const client = new Client({
		authStrategy: new LocalAuth({
			dataPath: sessionPath,
		}),
		puppeteer: {
			headless: true,
			args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
		},
	});

	// Store session details
	const sessionData = {
		id: sessionId,
		unitId: unitId,
		client: client,
		status: 'initializing',
		createdAt: new Date(),
		whatsappNumber: null,
		qrCode: null
	};

	sessions.set(unitId, sessionData);
	
	// Set up event listeners
	setupSessionEvents(client, unitId);

	// Initialize WhatsApp client
	try {
		await client.initialize();
		whatsappLogger.info(`Session initialized for unitId: ${unitId}`);
		return { 
			id: sessionId, 
			unit_id: unitId, 
			status: 'initializing' 
		};
	} catch (error) {
		whatsappLogger.error(`Failed to initialize session for unitId ${unitId}: ${error.message}`);
		// Clean up failed session
		sessions.delete(unitId);
		throw error;
	}
};

/**
 * Set up event listeners for a WhatsApp client
 * @param {Client} client WhatsApp client instance
 * @param {string} unitId Unique identifier for the session
 */
const setupSessionEvents = (client, unitId) => {
	client.on('qr', (qr) => {
		whatsappLogger.info(`QR Code received for unitId: ${unitId}`);
		
		// Generate and store QR code for retrieval
		qrCodes.set(unitId, qr);
		
		// Also display QR in console for development
		if (config.app.environment === 'development') {
			qrcode.generate(qr, { small: true });
		}
		
		// Update session status
		const session = sessions.get(unitId);
		if (session) {
			session.status = 'qr_received';
			session.qrCode = qr;
		}
	});

	client.on('ready', async () => {
		whatsappLogger.info(`WhatsApp client ready for unitId: ${unitId}`);
		
		// Update session status and get WhatsApp number
		try {
			const session = sessions.get(unitId);
			if (session) {
				const clientInfo = await client.info;
				const whatsappNumber = clientInfo.wid.user;
				
				session.status = 'ready';
				session.whatsappNumber = whatsappNumber;
				session.qrCode = null;
				
				whatsappLogger.info(`Session ${unitId} authenticated with WhatsApp number: ${whatsappNumber}`);
			}
		} catch (error) {
			whatsappLogger.error(`Error getting WhatsApp number for unitId ${unitId}: ${error.message}`);
		}
	});

	client.on('authenticated', () => {
		whatsappLogger.info(`Session authenticated for unitId: ${unitId}`);
		const session = sessions.get(unitId);
		if (session) {
			session.status = 'authenticated';
		}
	});

	client.on('auth_failure', (error) => {
		whatsappLogger.error(`Authentication failed for unitId ${unitId}: ${error.message}`);
		const session = sessions.get(unitId);
		if (session) {
			session.status = 'auth_failed';
		}
	});

	client.on('disconnected', (reason) => {
		whatsappLogger.warn(`Session disconnected for unitId ${unitId}: ${reason}`);
		const session = sessions.get(unitId);
		if (session) {
			session.status = 'disconnected';
		}
	});
};

/**
 * Get all active sessions
 * @returns {Array} List of sessions
 */
const getAllSessions = () => {
	const sessionList = [];
	sessions.forEach((session, unitId) => {
		sessionList.push({
			unitId: unitId,
			id: session.id,
			status: session.status,
			whatsappNumber: session.whatsappNumber,
			createdAt: session.createdAt
		});
	});
	return sessionList;
};

/**
 * Get session details by unitId
 * @param {string} unitId Unique identifier for the session
 * @returns {Object|null} Session details or null if not found
 */
const getSessionByUnitId = (unitId) => {
	const session = sessions.get(unitId);
	if (!session) return null;
	
	return {
		unitId: unitId,
		id: session.id,
		status: session.status,
		whatsappNumber: session.whatsappNumber,
		createdAt: session.createdAt,
		qrCode: session.qrCode
	};
};

/**
 * Get QR code for a session
 * @param {string} unitId Unique identifier for the session
 * @returns {string|null} QR code or null if not available
 */
const getSessionQR = (unitId) => {
	return qrCodes.get(unitId) || null;
};

/**
 * Delete a WhatsApp session
 * @param {string} unitId Unique identifier for the session
 * @returns {boolean} Success status
 */
const deleteSession = async (unitId) => {
	const session = sessions.get(unitId);
	if (!session) {
		return false;
	}

	try {
		// Logout and close client
		await session.client.destroy();
		whatsappLogger.info(`Session destroyed for unitId: ${unitId}`);
		
		// Remove from session maps
		sessions.delete(unitId);
		qrCodes.delete(unitId);
		
		return true;
	} catch (error) {
		whatsappLogger.error(`Error destroying session for unitId ${unitId}: ${error.message}`);
		throw error;
	}
};

/**
 * Get WhatsApp client by unitId
 * @param {string} unitId Unique identifier for the session
 * @returns {Client|null} WhatsApp client or null if not found
 */
const getClientByUnitId = (unitId) => {
	const session = sessions.get(unitId);
	return session ? session.client : null;
};

/**
 * Check if a session is ready (authenticated and connected)
 * @param {string} unitId Unique identifier for the session
 * @returns {boolean} Whether the session is ready
 */
const isSessionReady = (unitId) => {
	const session = sessions.get(unitId);
	return session && session.status === 'ready';
};

module.exports = {
	createSession,
	getAllSessions,
	getSessionByUnitId,
	getSessionQR,
	deleteSession,
	getClientByUnitId,
	isSessionReady,
	restoreSessions,
};