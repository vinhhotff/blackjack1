'use client';
import { useState, useCallback } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import Lobby from '@/components/Lobby';
import GameTable from '@/components/GameTable';

export default function HomePage() {
  const { socket, room } = useSocket();
  const [joined, setJoined] = useState(false);

  const handleJoinRoom = useCallback((roomId: string, username: string, role: 'dealer' | 'player') => {
    if (!socket) return;
    const seatIndex = role === 'dealer' ? 0 : undefined;
    socket.emit('joinRoom', { roomId, username, seatIndex });
    setJoined(true);
  }, [socket]);

  if (!joined) {
    return <Lobby onJoinRoom={handleJoinRoom} />;
  }

  return <GameTable />;
}
