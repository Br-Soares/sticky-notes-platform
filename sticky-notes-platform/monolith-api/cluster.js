import cluster from 'cluster';
import os from 'os';

if (cluster.isPrimary) {
    
    const numCPUs = os.cpus().length;

    console.log(`[primary] PID ${process.pid} — criando ${numCPUs} workers`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code) => {
        console.log(`[primary] worker ${worker.process.pid} saiu (code: ${code}) — reiniciando`);
        cluster.fork();
    });

} else {
    await import('./src/app.js');
    console.log(`[worker ${process.pid}] a escutar`);
}