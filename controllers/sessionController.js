const sessionService = require('../services/session');
const logger = require('../utils/logger');

/**
 * Create a new WhatsApp session
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Function} next Express next middleware function
 */
const createSession = async (req, res, next) => {
	try {
		const { unit_id } = req.body;
		
		if (!unit_id) {
			return res.status(400).json({
				success: false,
				message: 'unit_id is required'
			});
		}
		
		// Validate unitId format (alphanumeric and dashes only)
		if (!/^[a-zA-Z0-9-_]+$/.test(unit_id)) {
			return res.status(400).json({
				success: false,
				message: 'unitId must contain only alphanumeric characters, dashes, and underscores'
			});
		}
		
		logger.info(`Creating new WhatsApp session for unitId: ${unit_id}`);
		const session = await sessionService.createSession(unit_id);
		
		res.status(201).json({
			success: true,
			message: 'WhatsApp session created successfully',
			data: session
		});
	} catch (error) {
		logger.error(`Error creating WhatsApp session: ${error.message}`);
		
		// Handle duplicate session error
		if (error.message.includes('already exists')) {
			return res.status(409).json({
				success: false,
				message: error.message
			});
		}		
		next(error);
	}
};

/**
 * Get all WhatsApp sessions
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Function} next Express next middleware function
 */
const getAllSessions = async (req, res, next) => {
	try {
		logger.info('Getting all WhatsApp sessions');
		const sessions = sessionService.getAllSessions();
		
		res.status(200).json({
			success: true,
			count: sessions.length,
			data: sessions
		});
	} catch (error) {
		logger.error(`Error getting WhatsApp sessions: ${error.message}`);
		next(error);
	}
};

/**
 * Get a WhatsApp session by unitId
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Function} next Express next middleware function
 */
const getSessionByUnitId = async (req, res, next) => {
	try {
		const { unitId } = req.params;
		logger.info(`Getting WhatsApp session for unitId: ${unitId}`);
		
		const session = sessionService.getSessionByUnitId(unitId);
		
		if (!session) {
		return res.status(404).json({
			success: false,
			message: `No session found for unitId: ${unitId}`
		});
		}
		
		res.status(200).json({
			success: true,
			data: session
		});
	} catch (error) {
		logger.error(`Error getting WhatsApp session: ${error.message}`);
		next(error);
	}
};

/**
 * Get QR code for a WhatsApp session
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Function} next Express next middleware function
 */
const getSessionQR = async (req, res, next) => {
	try {
		const { unitId } = req.params;
		logger.info(`Getting QR code for unitId: ${unitId}`);
		
		const session = sessionService.getSessionByUnitId(unitId);
		
		if (!session) {
			return res.status(404).json({
				success: false,
				message: `No session found for unitId: ${unitId}`
			});
		}
		
		if (session.status !== 'qr_received') {
			return res.status(400).json({
				success: false,
				message: `Session ${unitId} is in ${session.status} state, QR code not available`
			});
		}
		
		const qrCode = session.qrCode;
		
		if (!qrCode) {
			return res.status(404).json({
				success: false,
				message: 'QR code not found or expired'
			});
		}
		
		res.status(200).json({
			success: true,
			data: {
				unitId,
				qrCode
			}
		});
	} catch (error) {
		logger.error(`Error getting QR code: ${error.message}`);
		next(error);
	}
};

/**
 * Delete a WhatsApp session
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Function} next Express next middleware function
 */
const deleteSession = async (req, res, next) => {
	try {
		const { unitId } = req.params;
		logger.info(`Deleting WhatsApp session for unitId: ${unitId}`);
		
		const result = await sessionService.deleteSession(unitId);
		
		if (!result) {
			return res.status(404).json({
				success: false,
				message: `No session found for unitId: ${unitId}`
			});
		}
		
		res.status(200).json({
			success: true,
			message: `Session for unitId ${unitId} deleted successfully`
		});
	} catch (error) {
		logger.error(`Error deleting WhatsApp session: ${error.message}`);
		next(error);
	}
};

module.exports = {
	createSession,
	getAllSessions,
	getSessionByUnitId,
	getSessionQR,
	deleteSession
};