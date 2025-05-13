const Bull = require('bull');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');
const { whatsappLogger } = require('../utils/logger');
const { getRandomDelay, processMessageContent,getErrorLocation } = require('../utils/helpers');
const whatsappService = require('./whatsapp');

// Create Redis client
const redisOptions = {
	host: config.redis.host,
	port: config.redis.port,
	db: config.redis.db
};

if (config.redis.password) {
  	redisOptions.password = config.redis.password;
}

// Map to store all queues by unitId
const queues = new Map();

/**
 * Initialize or get message queue for a specific unitId
 * @param {string} unitId Unique identifier for the queue
 * @returns {Bull.Queue} Bull queue instance
 */
const getMessageQueue = (unitId) => {
	// Check if queue already exists
	if (queues.has(unitId)) {
		return queues.get(unitId);
	}

	// Create new queue
	const queueName = `whatsapp-messages-${unitId}`;
	const queue = new Bull(queueName, {
		redis: redisOptions,
		defaultJobOptions: {
			attempts: config.queue.retryCount,
			backoff: {
				type: 'exponential',
				delay: config.queue.retryDelay
			},
			removeOnComplete: 100,  // Keep last 100 completed jobs
			removeOnFail: 100       // Keep last 100 failed jobs
		}
	});

	// Process jobs
	queue.process(async (job) => {
		const { recipient, message, debugMode } = job.data;
		
		// Log message processing
		whatsappLogger.info(`Processing message job ${job.id} for unitId: ${unitId}, to: ${recipient}`);
		
		if (debugMode) {
			whatsappLogger.info(`[DEBUG MODE] Would send message to ${recipient}: ${JSON.stringify(message)}`);
			return { success: true, debug: true, recipient };
		}

		try {
			// Send WhatsApp message
			const result = await whatsappService.sendMessage(unitId, recipient, message);

			if(result.success){
				const delay = getRandomDelay();
				await new Promise(resolve => setTimeout(resolve, delay));
    			return result;
			}
			return result;
		} catch (error) {
			let error_location = getErrorLocation(error);
			console.log(error)
			whatsappLogger.error(`Failed to send message to ${recipient}: [${error_location}] ${error.message}`);
			throw error;  // Let Bull handle retries
		}
	});

	// Set up event listeners
	setupQueueEvents(queue, unitId);

	// Store queue in map
	queues.set(unitId, queue);
	
	return queue;
};

/**
 * Set up event listeners for a queue
 * @param {Bull.Queue} queue Bull queue instance
 * @param {string} unitId Unique identifier for the queue
 */
const setupQueueEvents = (queue, unitId) => {
	queue.on('completed', (job, result) => {
		whatsappLogger.info(`Job ${job.id} completed for unit_id: ${unitId}, recipient: ${job.data.recipient}, result: ${JSON.stringify(result)}`);
	});

	queue.on('failed', (job, error) => {
		whatsappLogger.error(`Job ${job.id} failed for unit_id: ${unitId}, recipient: ${job.data.recipient}, error: ${error.message}`);
	});

	queue.on('error', (error) => {
		logger.error(`Queue error for unit_id ${unitId}: ${error.message}`);
	});
};

/**
 * Add message to queue
 * @param {string} unitId Unique identifier for the queue
 * @param {string|Array} recipients Single phone number or array of phone numbers
 * @param {Object} message Message content
 * @param {boolean} debugMode Whether to run in debug mode
 * @returns {Promise<Object>} Queue job details
 */
const queueMessage = async (unitId, recipients, message, debugMode = false) => {
	const queue = getMessageQueue(unitId);
	
	// Convert single recipient to array for consistent handling
	const recipientList = Array.isArray(recipients) ? recipients : [recipients];
	
	// Process message content
	const processedMessage = processMessageContent(message);
	
	// Queue jobs for each recipient
	const jobPromises = recipientList.map(async (recipient) => {
		const jobId = `msg-${uuidv4()}`;
		const job = await queue.add({
			recipient,
			message: processedMessage,
			debugMode
		}, {
			jobId,
			attempts: config.queue.retryCount,
			backoff: {
				type: 'exponential',
				delay: config.queue.retryDelay
			}
		});
		
		return {
			id: job.id,
			recipient
		};
	});
	
	// Wait for all jobs to be added
	const jobs = await Promise.all(jobPromises);
	
	return {
		jobCount: jobs.length,
		jobs
	};
};

/**
 * Get queue statistics for a unitId
 * @param {string} unitId Unique identifier for the queue
 * @returns {Promise<Object>} Queue statistics
 */
const getQueueStats = async (unitId) => {
	const queue = getMessageQueue(unitId);
	
	try {
		// Get counts of jobs in different states
		const [waiting, active, completed, failed, delayed] = await Promise.all([
			queue.getWaitingCount(),
			queue.getActiveCount(),
			queue.getCompletedCount(),
			queue.getFailedCount(),
			queue.getDelayedCount()
		]);
		
		return {
			unitId,
			waiting,
			active,
			completed,
			failed,
			delayed,
			total: waiting + active + delayed
		};
	} catch (error) {
		logger.error(`Error getting queue stats for unitId ${unitId}: ${error.message}`);
		throw error;
	}
};

/**
 * Get all queues statistics
 * @returns {Promise<Array>} Array of queue statistics
 */
const getAllQueuesStats = async () => {
	const statsPromises = [];	
	for (const unitId of queues.keys()) {
		statsPromises.push(getQueueStats(unitId));
	}	
	return Promise.all(statsPromises);
};

/**
 * Clear all pending jobs in a queue
 * @param {string} unitId Unique identifier for the queue
 * @returns {Promise<Object>} Result of the operation
 */
const clearQueue = async (unitId) => {
	const queue = getMessageQueue(unitId);
	
	try {
		// Get waiting and delayed jobs
		const waitingJobs = await queue.getWaiting();
		const delayedJobs = await queue.getDelayed();
		
		// Remove all waiting and delayed jobs
		const removePromises = [
			...waitingJobs.map(job => job.remove()),
			...delayedJobs.map(job => job.remove())
		];
		
		await Promise.all(removePromises);
		
		const removedCount = removePromises.length;
		logger.info(`Cleared ${removedCount} jobs from queue for unitId: ${unitId}`);
		
		return {
			success: true,
			removedCount
		};
	} catch (error) {
		logger.error(`Error clearing queue for unitId ${unitId}: ${error.message}`);
		throw error;
	}
};

/**
 * Close all queues (for graceful shutdown)
 */
const closeAllQueues = async () => {
	const closePromises = [];
	
	for (const [unitId, queue] of queues.entries()) {
		logger.info(`Closing queue for unitId: ${unitId}`);
		closePromises.push(queue.close());
	}
	
	return Promise.all(closePromises);
};

module.exports = {
	queueMessage,
	getQueueStats,
	getAllQueuesStats,
	clearQueue,
	closeAllQueues
};