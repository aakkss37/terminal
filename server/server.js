import { WebSocketServer } from 'ws';
import express from 'express';
import cors from 'cors';
import http from 'http';
import os from 'os';
import pty from 'node-pty';

const app = express();
const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

// Enable CORS for all origins
app.use(cors());

// Basic HTTP route
app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Create an HTTP server
const server = http.createServer(app);

// Attach WebSocket server to the HTTP server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
    console.log('New WebSocket connection');

    // Start a pty process for the shell
    const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cwd: process.env.HOME,
        env: process.env,
    });

    // Send shell output to WebSocket
    ptyProcess.onData((data) => {
        ws.send(data);
    });

    ws.on('message', (message) => {
        try {
            const parsedData = JSON.parse(message);

            if (parsedData.type === 'command' && parsedData.command) {
                // Write command to the pty process
                ptyProcess.write(`${parsedData.command}\n`);
            } else {
                ws.send(JSON.stringify({ error: 'Invalid message format' }));
            }
        } catch (error) {
            console.error('Invalid JSON received:', message);
            ws.send(JSON.stringify({ error: 'Invalid JSON format' }));
        }
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed');
        ptyProcess.kill();
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });

    ptyProcess.onExit(({ exitCode }) => {
        console.log(`PTY process exited with code ${exitCode}`);
    });
});

// Start the HTTP server
server.listen(8080, () => {
    console.log('Server started on port 8080');
});
