'use client';
import React, { useState } from 'react';
import { useSocket } from '@/contexts/SocketContext';

interface LobbyProps {
    onJoinRoom: (roomId: string, username: string, role: 'dealer' | 'player') => void;
}

export default function Lobby({ onJoinRoom }: LobbyProps) {
    const [username, setUsername] = useState('');
    const [role, setRole] = useState<'dealer' | 'player'>('player');
    const [error, setError] = useState('');
    const { isConnected } = useSocket();

    const handleJoin = () => {
        if (!username.trim()) {
            setError('Vui lòng nhập tên!');
            return;
        }
        if (username.trim().length < 2) {
            setError('Tên phải có ít nhất 2 ký tự!');
            return;
        }
        onJoinRoom('main', username.trim(), role);
    };

    return (
        <div className="lobby-container">
            <div className="lobby-backdrop" />

            <div className="lobby-card">
                {/* Logo */}
                <div className="lobby-logo">
                    <div className="logo-cards">
                        <span className="logo-card logo-card-1">♠</span>
                        <span className="logo-card logo-card-2">♥</span>
                        <span className="logo-card logo-card-3">♦</span>
                        <span className="logo-card logo-card-4">♣</span>
                    </div>
                    <h1 className="lobby-title">BLACKJACK</h1>
                    <p className="lobby-subtitle">Multiplayer • Real-time • Bàn Bạn Bè</p>
                </div>

                {/* Connection status */}
                <div className={`connection-status ${isConnected ? 'connected' : 'connecting'}`}>
                    <span className="status-dot" />
                    {isConnected ? 'Đã kết nối' : 'Đang kết nối...'}
                </div>

                {/* Form */}
                <div className="lobby-form">
                    <div className="form-group">
                        <label className="form-label">Tên của bạn</label>
                        <input
                            className="form-input"
                            type="text"
                            placeholder="Nhập tên hiển thị..."
                            value={username}
                            onChange={e => { setUsername(e.target.value); setError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleJoin()}
                            maxLength={20}
                            autoFocus
                        />
                    </div>

                    {/* Role selector */}
                    <div className="form-group">
                        <label className="form-label">Vai trò</label>
                        <div className="role-selector">
                            <button
                                className={`role-btn ${role === 'player' ? 'role-active' : ''}`}
                                onClick={() => setRole('player')}
                            >
                                <span className="role-icon">🎮</span>
                                <div>
                                    <div className="role-title">Người Chơi</div>
                                    <div className="role-desc">Đặt cược & chơi bài</div>
                                </div>
                            </button>
                            <button
                                className={`role-btn ${role === 'dealer' ? 'role-active' : ''}`}
                                onClick={() => setRole('dealer')}
                            >
                                <span className="role-icon">👑</span>
                                <div>
                                    <div className="role-title">Dealer</div>
                                    <div className="role-desc">Điều khiển ván chơi</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {error && <div className="form-error">{error}</div>}

                    <button
                        className="btn-join"
                        onClick={handleJoin}
                        disabled={!isConnected || !username.trim()}
                    >
                        {isConnected ? `${role === 'dealer' ? '👑 Làm Dealer' : '🎮 Vào Bàn'}` : '⏳ Đang kết nối...'}
                    </button>
                </div>

                {/* Info */}
                <div className="lobby-info">
                    <div className="info-item">🃏 Blackjack Châu Âu</div>
                    <div className="info-item">👥 Tối đa 6 người + 1 Dealer</div>
                    <div className="info-item">🤚 Tối đa 3 tay / người</div>
                    <div className="info-item">💎 Side bets: Perfect Pairs & 21+3</div>
                </div>
            </div>
        </div>
    );
}
