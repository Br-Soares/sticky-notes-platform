import express from 'express';
import notesRouter from './routes/notes.js';
import { errorHandler, notFound } from './middleware/error.js';

const app  = express();
const PORT = 3021;

app.use(express.json());
app.use('/notes', notesRouter);
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => console.log(`[notes-service] listening on port ${PORT}`));

export default app;