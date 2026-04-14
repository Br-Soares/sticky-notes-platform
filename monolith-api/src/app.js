const express = require('express');
const app = express();

app.use(express.json());

app.use('/notes', require('./routes/notes'));

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(require('./middleware/error'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sticky Notes API running on http://localhost:${PORT}`));
