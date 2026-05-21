const TOTAL = parseInt(process.argv[2]) || 128;
const CONCURRENCY = parseInt(process.argv[3]) || 32;

async function singleRequest(id) {
    const start = Date.now();
    try {
        const res = await fetch('http://localhost:3000/notes');
        return {
            id,
            status: res.status,
            ms: Date.now() - start,
            worker: res.headers.get('x-worker-pid')
        };
    } catch (e) {
        return { id, status: 'ERR', ms: Date.now() - start, worker: null };
    }
}

async function main() {
    console.log(`\nPedidos: ${TOTAL} total, ${CONCURRENCY} em simultâneo\n`);

    const results = [];

    // Envia pedidos em lotes de CONCURRENCY
    for (let i = 0; i < TOTAL; i += CONCURRENCY) {
        const batchSize = Math.min(CONCURRENCY, TOTAL - i);
        const batch = Array.from({ length: batchSize }, (_, j) => singleRequest(i + j));
        const batchRes = await Promise.all(batch);
        results.push(...batchRes);
    }

    // Métricas
    const ok     = results.filter(r => r.status === 200).length;
    const erros  = results.filter(r => r.status !== 200).length;
    const times  = results.map(r => r.ms)
    const avg    = (times.reduce((s, t) => s + t, 0) / times.length).toFixed(1);

    // Distribuição por worker
    const workers = {};
    results.forEach(r => {
        if (r.worker) workers[r.worker] = (workers[r.worker] || 0) + 1;
    });

    console.log('\n=========== Resultados ===========');
    console.log(`  Total: ${TOTAL} | ✓ OK: ${ok} | ✗ Erros: ${erros}`);
    console.log(`  Tempo médio : ${avg}ms`);
    if (Object.keys(workers).length > 0) {
        console.log(`  Workers PIDs : ${JSON.stringify(workers)}`);
    }
    console.log('======================================\n');
}

main();