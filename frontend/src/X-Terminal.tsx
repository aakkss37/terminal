import React, { useEffect, useRef } from "react";
import { Terminal } from '@xterm/xterm';
import "@xterm/xterm/css/xterm.css"

const term = new Terminal({
    cols: 80,
    rows: 24,
    cursorBlink: true, // Makes the terminal cursor blink
});



const XTerminal: React.FC = () => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const commandBuffer = useRef<string>(""); // Buffer to store the user's input

    useEffect(() => {
        // Open the terminal in the referenced div
        term.open(terminalRef.current as HTMLDivElement);
        term.write("Connecting to backend...\r\n");

        // Establish WebSocket connection
        const socket = new WebSocket("ws://localhost:8080/ws");
        socketRef.current = socket;

        // Handle WebSocket events
        socket.onopen = () => {
            term.write("Connection established. Start typing commands...\r\n");
        };

        socket.onmessage = (event) => {
            // Write data received from the server to the terminal
            term.write(event.data);
        };

        socket.onerror = (error) => {
            term.write("\r\nError connecting to backend server.\r\n");
            console.error("WebSocket error:", error);
        };

        socket.onclose = () => {
            term.write("\r\nConnection closed by the server.\r\n");
        };

        // Listen for user input and handle commands on Enter key
        term.onData((input) => {
            if (input === "\r") {
                // User pressed Enter, send the command to the backend
                const command = commandBuffer.current.trim();
                if (command && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: "command", command }));
                    term.write(`\r\n`); // Move to the next line
                } else if (!command) {
                    term.write("\r\n"); // Just move to the next line for empty input
                }
                commandBuffer.current = ""; // Clear the buffer after sending
            } else if (input === "\u007F") {
                // Handle backspace
                if (commandBuffer.current.length > 0) {
                    commandBuffer.current = commandBuffer.current.slice(0, -1);
                    term.write("\b \b"); // Move the cursor back, clear the character, move back again
                }
            } else {
                // Add input to the command buffer and display it on the terminal
                commandBuffer.current += input;
                term.write(input);
            }
        });

        // Cleanup on unmount
        return () => {
            socket.close();
            term.dispose();
        };
    }, [terminalRef]);

    return (
        <div ref={terminalRef} style={{ textAlign: "left" }}></div>
    );
};

export default XTerminal;
