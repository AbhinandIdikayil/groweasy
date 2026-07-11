import express from 'express';
import cors from "cors";
import { router } from './routes/route';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { leadQueue } from './queue/leadProcessor';
import { ENV } from './config/env';

const PORT = 3001;
const app = express();

app.use(cors({
    origin: ENV.ORIGIN
}))

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
    queues: [new BullMQAdapter(leadQueue)],
    serverAdapter: serverAdapter,
});

app.use(express.json());

app.use('/api/leads', router);
app.use('/admin/queues', serverAdapter.getRouter());

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
    console.log(`For the UI, open http://localhost:${PORT}/admin/queues`);
})