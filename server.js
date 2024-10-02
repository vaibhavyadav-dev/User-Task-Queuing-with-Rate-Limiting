const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();

app.use(bodyParser.json());

// In-memory storage for user rate limiting and task queueing
// { user_id: { perSecond: [], perMinute: [], queue: [] } }

// perSecond - will store how many request per second
// perMinute -  will store how many request per minute
// queue -  will hold the request inorder to process them later
const userTasks = new Map();  


async function task(user_id){
    const logs = `${user_id}-task completed at-${Date.now()}`
    fs.appendFileSync('task_logs.txt', logs);
    console.log(logs)
}

// Middleware for rate limiting and queuing tasks
const rateLimiter = (req, res, next) => {
    const user_id = req.body.user_id;
    const currentTime = Date.now();

    if (!userTasks.has(user_id)) {
        userTasks.set(user_id, { perSecond: [], perMinute: [], queue: [] });
    }
    const userData = userTasks.get(user_id);

    // Filter out timestamps older than 1 second and 1 minute
    userData.perSecond = userData.perSecond.filter(ts => currentTime - ts < 1000);
    userData.perMinute = userData.perMinute.filter(ts => currentTime - ts < 60000);

    // Check if the user has exceeded the rate limits
    if (userData.perSecond.length >= 1 || userData.perMinute.length >= 20) {
        // Queue the task and hold the response until processed
        userData.queue.push({ req, res });
        return;  // Don't call next(), task is queued for later processing
    }

    // Update rate limit trackers
    userData.perSecond.push(currentTime);
    userData.perMinute.push(currentTime);
    next();
};

// Process the queue for each user, respecting rate limits
const processQueue = () => {
    const currentTime = Date.now();
    userTasks.forEach((user_data, user_id) => {
        // Check if there are any tasks in the queue
        if (user_data.queue.length > 0) {
            // Respect the rate limits before processing the next task
            user_data.perSecond = user_data.perSecond.filter(ts => currentTime - ts < 1000);
            user_data.perMinute = user_data.perMinute.filter(ts => currentTime - ts < 60000);

            if (user_data.perSecond.length < 1 && user_data.perMinute.length < 20) {
                // If rate limits allow, process the next task in the queue
                const { req, res } = user_data.queue.shift();

                // Process the task
                user_data.perSecond.push(currentTime);
                user_data.perMinute.push(currentTime);

                task(req.body.user_id);
                res.status(200).json({ message: 'Task processed successfully (Took Sometime because rate limit were exceeded).' });
            }
        }
    });
};

// Set an interval to check and process the queue every second
setInterval(processQueue, 1000);

// Route to process tasks + middleware + callbackfunction
app.post('/process-task', rateLimiter, (req, res) => {
    const timestamp = new Date().toISOString();
    const { user_id } = req.body;

    if (!userTasks.has(user_id)) {
        userTasks.set(user_id, { perSecond: [], perMinute: [], queue: [] });
    }
    // If there are no tasks in the queue, process immediately
    const userData = userTasks.get(user_id);
    if (userData.queue.length === 0) {
        task(user_id);
        res.status(200).send({ message: 'Task processed Instantly (At the time request arrived) - ' + timestamp });
    } else {
        // If there are tasks in the queue, they will be processed by the interval handler
        userData.queue.push({ req, res });
    }
});

// Start the server
app.listen(3000,  console.log('Server running on port 3000... :) (this is CI/CD) '));
