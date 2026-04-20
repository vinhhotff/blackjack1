'use client';
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/lib/gameTypes';

interface ChatPanelProps {
    messages: ChatMessage[];
    onSend: (message: string) => void;
    currentUserId: string | null;
}

export default function ChatPanel({ messages, onSend, currentUserId }: ChatPanelProps) {
    const [input, setInput] = useState('');
    const [isOpen, setIsOpen] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        const trimmed = input.trim();
        if (!trimmed) return;
        onSend(trimmed);
        setInput('');
    };

    const formatTime = (ts: number) => {
        return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const unreadCount = 0;

    return (
        <div className={`chat-panel ${isOpen ? 'chat-open' : 'chat-collapsed'}`}>
            <div className="chat-header" onClick={() => setIsOpen(!isOpen)}>
                <span>💬 Trò chuyện</span>
                {!isOpen && unreadCount > 0 && <span className="chat-badge">{unreadCount}</span>}
                <span className="chat-toggle">{isOpen ? '▼' : '▲'}</span>
            </div>

            {isOpen && (
                <>
                    <div className="chat-messages">
                        {messages.map(msg => (
                            <div
                                key={msg.id}
                                className={`chat-msg ${msg.type === 'system' ? 'msg-system' : msg.type === 'game' ? 'msg-game' : msg.userId === currentUserId ? 'msg-self' : 'msg-other'}`}
                            >
                                {msg.type === 'chat' && (
                                    <span className="msg-username">{msg.username}: </span>
                                )}
                                <span className="msg-content">{msg.message}</span>
                                <span className="msg-time">{formatTime(msg.timestamp)}</span>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>

                    <div className="chat-input-row">
                        <input
                            className="chat-input"
                            type="text"
                            placeholder="Gáy đi nào... 😄"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            maxLength={200}
                        />
                        <button className="chat-send-btn" onClick={handleSend}>
                            ➤
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
