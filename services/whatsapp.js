const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs').promises;
const path = require('path');
const { whatsappLogger } = require('../utils/logger');
const sessionService = require('./session');
const { validatePhoneNumber, formatError,getMimeType } = require('../utils/helpers');

/**
 * Send a message to a recipient
 * @param {string} unitId Unique identifier for the session
 * @param {string} recipient Recipient phone number
 * @param {Object} messageContent Processed message content
 * @returns {Promise<Object>} Result of the send operation
 */
const sendMessage = async (unitId, recipient, messageContent) => {
	// Validate session
	if (!sessionService.isSessionReady(unitId)) {
		throw new Error(`WhatsApp session ${unitId} is not ready`);
	}

	// Get WhatsApp client
	const client = sessionService.getClientByUnitId(unitId);
	if (!client) {
		throw new Error(`No WhatsApp client found for unitId: ${unitId}`);
	}

	// Validate phone number
	const formattedNumber = validatePhoneNumber(recipient);
	if (!formattedNumber) {
		throw new Error(`Invalid phone number: ${recipient}`);
	}

	// Format the recipient with WhatsApp ID format
	const chatId = `${formattedNumber}@c.us`;

	try {
		// Check if the contact exists on WhatsApp
		const isRegistered = await client.isRegisteredUser(chatId);
		if (!isRegistered) {
			whatsappLogger.warn(`Phone number ${formattedNumber} is not registered on WhatsApp`);
			return {
				success: false,
				error: 'not_registered',
				message: `Phone number ${formattedNumber} is not registered on WhatsApp`
			};
		}

		// Handle different types of messages
		let result = null;

		// Send text message if present
		if (messageContent.hasText) {
			result = await client.sendMessage(chatId, messageContent.content.text);
			whatsappLogger.info(`Sent text message to ${formattedNumber} from unitId: ${unitId}`);
		}

		// Send media message if present
		if (messageContent.hasMedia) {
			let media;			
			try {
				const mediaContent = messageContent.content.media;

				if(typeof mediaContent === 'string' && mediaContent.startsWith('http')) {
					media = await MessageMedia.fromUrl(mediaContent);
					whatsappLogger.info(`Loading media URL from ${mediaContent}`);
				}else{
					const filePath = path.resolve(mediaContent.path || mediaContent);          
					if (await fs.access(filePath).then(() => true).catch(() => false)) {
						const mimeType = getMimeType(filePath);
						const base64Data = await fs.readFile(filePath, {encoding: 'base64'});
						const fileName = path.basename(filePath);
						
						media = new MessageMedia(mimeType, base64Data, fileName);
						whatsappLogger.debug(`Loading media from file: ${fileName}`);
					} else {
						throw new Error(`Media file not found: ${filePath}`);
					}
				}

				if (!media) {
					throw new Error('Invalid media content provided');
				}

				// Send media message
				result = await client.sendMessage(chatId, media, {
					caption: messageContent.content.caption || '',
					sendMediaAsDocument: false
				});

				// Cleanup temp file if it exists
				if (mediaContent.path) {
					await fs.unlink(mediaContent.path).catch(err => whatsappLogger.error(`Failed to cleanup media: ${err.message}`));
				}

				whatsappLogger.info(`Sent media message to ${formattedNumber} from unitId: ${unitId}`);

			} catch (error) {
				whatsappLogger.error(`Failed to process media: ${error.message}`);
				throw error;
			}
		}

		// Send document if present
		if (messageContent.hasDocument) {
			let document;
			try {
				const docContent = messageContent.content.document;
				
				if (typeof docContent === 'string' && docContent.startsWith('http')) {
					document = await MessageMedia.fromUrl(docContent);
					whatsappLogger.debug(`Loading document from URL: ${docContent}`);
				}else if (typeof docContent === 'string' || docContent.path) {
					const filePath = path.resolve(docContent.path || docContent);
					
					if (await fs.access(filePath).then(() => true).catch(() => false)) {
						const mimeType = getMimeType(filePath);
						const base64Data = await fs.readFile(filePath, {encoding: 'base64'});
						const fileName = path.basename(filePath);
						
						document = new MessageMedia(mimeType, base64Data, fileName);
						whatsappLogger.debug(`Loading document from file: ${fileName}`);
					} else {
						throw new Error(`Document file not found: ${filePath}`);
					}
				}

				if (!document) {
					throw new Error('Invalid document content provided');
				}

				// Send document message
				result = await client.sendMessage(chatId, document, {
					caption: messageContent.content.caption || '',
					sendMediaAsDocument: true
				});

				// Cleanup temp file if it exists
				if (docContent.path) {
					await fs.unlink(docContent.path).catch(err => whatsappLogger.error(`Failed to cleanup document: ${err.message}`));
				}

				whatsappLogger.info(`Sent document message to ${formattedNumber} from unitId: ${unitId}`);
			} catch (error) {
				whatsappLogger.error(`Failed to process document: ${error.message}`);
				throw error;
			}
		}

		return {
			success: true,
			recipient: formattedNumber,
			messageId: result?.id?.id || null
		};
	} catch (error) {
		whatsappLogger.error(`Error sending message to ${formattedNumber} from unitId ${unitId}: ${formatError(error)}`);
		throw error;
	}
};

module.exports = {
  sendMessage
};