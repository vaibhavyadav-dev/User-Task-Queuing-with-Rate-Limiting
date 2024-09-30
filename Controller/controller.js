const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();

app.use(bodyParser.json());

// In-memory data structures
const userTasks = new Map();  // { userId: { timestamps: [], queue: [] } }

// Task function provided
const processTask = (userId) => {
    const timestamp = new Date().toISOString();
    const log = `User: ${userId}, Task completed at: ${timestamp}\n`;
    fs.appendFileSync('task_logs.txt', log);
    console.log(log);
};

// Middleware for rate limiting
const rateLimiter = (req, res, next) => {
    const userId = req.body.userId;
    const currentTime = Date.now();

    if (!userTasks.has(userId)) {
        userTasks.set(userId, { timestamps: [], queue: [] });
    }

    const userData = userTasks.get(userId);
    const timestamps = userData.timestamps;

    // Filter timestamps to keep only the last minute
    userData.timestamps = timestamps.filter(ts => currentTime - ts < 60000);

    // Check if the user has exceeded the rate limit
    if (userData.timestamps.length >= 20) {
        return res.status(429).send('Rate limit exceeded. Try again later.');
    }

    // Allow the request
    userData.timestamps.push(currentTime);
    next();
};

// Task Queue Handler
const handleTaskQueue = (userId) => {
    const userData = userTasks.get(userId);
    if (userData.queue.length > 0) {
        setTimeout(() => {
            processTask(userId);
            userData.queue.shift();
            handleTaskQueue(userId);  // Process the next task in the queue
        }, 1000);  // One task per second
    }
};

// Route to process tasks
app.post('/process-task', rateLimiter, (req, res) => {
    const { userId } = req.body;

    if (!userTasks.has(userId)) {
        userTasks.set(userId, { timestamps: [], queue: [] });
    }

    const userData = userTasks.get(userId);

    // Add task to the user's queue
    userData.queue.push(() => processTask(userId));

    // If it's the only task in the queue, process it immediately
    if (userData.queue.length === 1) {
        handleTaskQueue(userId);
    }

    res.status(202).send('Task queued or processed.');
});

// Start the server
app.listen(3000, () => {
    console.log('Server running on port 3000');
});
