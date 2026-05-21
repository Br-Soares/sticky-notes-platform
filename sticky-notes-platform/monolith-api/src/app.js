const express = require('express');
const app = express();

app.use(express.json());

app.use((req, res, next) => {
    const pid = process.pid;
    console.log(`[worker ${pid}] ${req.method} ${req.path}`);

    res.setHeader('X-Worker-PID', pid);
    next();
});

app.use('/notes', require('./routes/notes'));

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(require('./middleware/error'));

const PORT = 3000;
app.listen(PORT, () => console.log(`[worker ${process.pid}] Sticky Notes API running on http://localhost:${PORT}`));
