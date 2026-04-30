import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { sessionsRouter } from './src/routes/sessions.js';
import { setupSockets } from './src/socket.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// CORS for React frontend
const io = new Server(httpServer, {
    cors: {
        origin: '*', // For dev
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.send('Mini Scribe Backend API');
});
app.use('/api/sessions', sessionsRouter);

// Socket setup
setupSockets(io);

const port = process.env.PORT || 3000;

httpServer.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
