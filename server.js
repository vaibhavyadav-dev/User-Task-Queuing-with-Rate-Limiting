const express = require('express');
const bodyParser = require('body-parser');
const redis = require('redis');
const fs = require('fs');
const app = express();

app.use(bodyParser.json());

// Create a Redis client with built-in Promise support
const redisClient = redis.createClient({
    socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
    }
});

// Connect the Redis client once during startup
if (!redisClient.isOpen) {
    redisClient.connect().catch(err => {
        console.error('Error connecting to Redis:', err);
    });
}

// Error handling for Redis
redisClient.on('error', (err) => {
    console.error('Redis error:', err);
});

// Task processing function (logs task completion with userId and timestamp)
const processTask = (userId) => {
    const timestamp = new Date().toISOString();
    const log = `User: ${userId}, Task completed at: ${timestamp}\n`;
    fs.appendFileSync('task_logs.txt', log);
    console.log(log);
};

// Middleware to handle rate limiting and queuing
const rateLimiter = async (req, res, next) => {
    const userId = req.body.userId;

    try {
        // Get task counts for the user in the current second and minute
        const tasksInSecond = await redisClient.get(`user:${userId}:second`);
        const tasksInMinute = await redisClient.get(`user:${userId}:minute`);

        const tasksThisSecond = tasksInSecond ? parseInt(tasksInSecond, 10) : 0;
        const tasksThisMinute = tasksInMinute ? parseInt(tasksInMinute, 10) : 0;

        if (tasksThisSecond >= 1 || tasksThisMinute >= 20) {
            // Rate limit exceeded - queue the task in Redis
            await redisClient.rPush(`user:${userId}:queue`, JSON.stringify(req.body));
            console.log(`Task for user ${userId} queued.`);
            return res.status(202).send('Rate limit exceeded. Task added to the queue.');
        }

        // Update the user's task counts in Redis
        await redisClient.multi()
            .incr(`user:${userId}:second`)
            .expire(`user:${userId}:second`, 1) // TTL of 1 second
            .incr(`user:${userId}:minute`)
            .expire(`user:${userId}:minute`, 60) // TTL of 60 seconds
            .exec();

        next();  // Proceed to process the task if rate limit is not exceeded
    } catch (err) {
        console.error('Rate limiter error:', err);
        res.status(500).send('Internal server error');
    }
};

// Process tasks from the queue for each user, respecting the rate limit
const processQueue = async (userId) => {
    try {
        // Get the next task in the queue for the user
        const queuedTask = await redisClient.lPop(`user:${userId}:queue`);

        if (queuedTask) {
            const taskData = JSON.parse(queuedTask);
            processTask(taskData.userId);

            // Update rate limit counts in Redis
            await redisClient.multi()
                .incr(`user:${taskData.userId}:second`)
                .expire(`user:${taskData.userId}:second`, 1)
                .incr(`user:${taskData.userId}:minute`)
                .expire(`user:${taskData.userId}:minute`, 60)
                .exec();
        }
    } catch (err) {
        console.error('Error processing queue:', err);
    }
};

// Periodically check and process queued tasks for each user
setInterval(async () => {
    try {
        // Get all keys that represent user queues
        const userKeys = await redisClient.keys('user:*:queue');

        for (const userKey of userKeys) {
            const userId = userKey.split(':')[1];
            await processQueue(userId);
        }
    } catch (err) {
        console.error('Error processing queues:', err);
    }
}, 1000); // Process queues every second

// Route to handle task requests
app.post('/process-task', rateLimiter, (req, res) => {
    const { userId } = req.body;

    // Process the task immediately if within the rate limit
    processTask(userId);
    res.status(200).send('Task processed successfully.'); 
});

// Start the server
app.listen(3000, () => {
    console.log('Server running on port 3000');
});
