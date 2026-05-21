
import notesRouter from './routes/notes.js';
import { errorHandler, notFound } from './middleware/error.js';
import express from 'express';

const app  = express();
const PORT = 3000;

app.use(express.json());
app.use('/notes', notesRouter);
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => console.log(`[api-gateway] listening on port ${PORT}`));

export default app;