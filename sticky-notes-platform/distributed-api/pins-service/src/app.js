
import express from 'express';
import pinsRouter from './routes/pins.js';
import { errorHandler, notFound } from './middleware/error.js';

const app  = express();
const PORT = 3002;

app.use(express.json());
app.use('/pins', pinsRouter);
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => console.log(`[pins-service] listening on port ${PORT}`));

export default app;