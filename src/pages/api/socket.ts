import { createServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import { initSocketServer } from '@/lib/socketServer';

const httpServer = createServer();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!res.socket) {
        res.status(500).end('No socket');
        return;
    }

    const server = (res.socket as any).server;

    if (!server.io) {
        console.log('[API] Initializing Socket.IO server...');
        const io = initSocketServer(server);
        server.io = io;
    }

    res.end();
}
