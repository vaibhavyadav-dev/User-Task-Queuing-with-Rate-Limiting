const cluster = require('cluster');
// if master node then fork two worker nodes else call the worker nodes
if (cluster.isMaster) {
    for (let i = 0; i < 2; i++) {
        // create replica 
        cluster.fork();
    }

} else {
    // main file goes here this will handle the request on each 
    require('./server');
}
