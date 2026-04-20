'use client';
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { Room, ChatMessage } from '@/lib/gameTypes';

interface SocketContextType {
    socket: Socket | null;
    room: Room | null;
    messages: ChatMessage[];
    bettingTimeLeft: number;
    isConnected: boolean;
    userId: string | null;
}

const SocketContext = createContext<SocketContextType>({
    socket: null, room: null, messages: [], bettingTimeLeft: 20, isConnected: false, userId: null,
});

export function SocketProvider({ children }: { children: ReactNode }) {
    const socketRef = useRef<Socket | null>(null);
    const [room, setRoom] = useState<Room | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [bettingTimeLeft, setBettingTimeLeft] = useState(20);
    const [isConnected, setIsConnected] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        // Initialize server-side socket
        fetch('/api/socket').finally(() => {
            const socket = io({ transports: ['websocket', 'polling'] });
            socketRef.current = socket;

            socket.on('connect', () => {
                setIsConnected(true);
                setUserId(socket.id || null);
            });

            socket.on('disconnect', () => {
                setIsConnected(false);
            });

            socket.on('roomState', (roomData: Room) => {
                setRoom(roomData);
            });

            socket.on('roundFinished', (roomData: Room) => {
                setRoom(roomData);
            });

            socket.on('chatMessage', (msg: ChatMessage) => {
                setMessages(prev => [...prev.slice(-99), msg]);
            });

            socket.on('bettingTimer', (timeLeft: number) => {
                setBettingTimeLeft(timeLeft);
            });

            socket.on('error', ({ message }: { message: string }) => {
                alert(`[Game Event] ${message}`);
            });
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={{
            socket: socketRef.current,
            room,
            messages,
            bettingTimeLeft,
            isConnected,
            userId,
        }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    return useContext(SocketContext);
}
