const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
    const numCPUs = 2;  // Two replicas
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Starting a new one.`);
        cluster.fork();
    });
} else {
    require('./Controller/controller');  // Import your server here
}
