'use client';
import React, { useState } from 'react';
import { CHIP_DENOMINATIONS, Player } from '@/lib/gameTypes';

interface DealerControlsProps {
    players: Player[];
    gameState: string;
    dealerChips: number;
    onStartBetting: () => void;
    onDeal: () => void;
    onResetGame: () => void;
    onPumpChips: (targetUserId: string, amount: number) => void;
    onAutoPlay: () => void;
}

export default function DealerControls({
    players, gameState, dealerChips, onStartBetting, onDeal, onResetGame, onPumpChips, onAutoPlay
}: DealerControlsProps) {
    const [pumpTarget, setPumpTarget] = useState('');
    const [pumpAmount, setPumpAmount] = useState(1000);
    const [showPump, setShowPump] = useState(false);

    const activePlayers = players.filter(p => p.role === 'PLAYER' && p.isConnected);

    return (
        <div className="dealer-controls-panel">
            <div className="dealer-controls-header">
                <span>👑 Bảng Điều Khiển Dealer</span>
                <span className="dealer-bankroll">🏦 {dealerChips.toLocaleString()}</span>
            </div>

            <div className="dealer-buttons">
                {/* Game flow buttons */}
                {(gameState === 'WAITING' || gameState === 'FINISHED') && (
                    <button className="btn-primary btn-start" onClick={onStartBetting}>
                        🎲 Bắt Đầu Đặt Cược
                    </button>
                )}

                {gameState === 'BETTING' && (
                    <button className="btn-primary btn-deal-now" onClick={onDeal}>
                        🃏 Chia Bài Ngay
                    </button>
                )}

                {gameState === 'DEALER_TURN' && (
                    <button className="btn-primary btn-autoplay" onClick={onAutoPlay}>
                        ▶️ Tự Động Rút Bài
                    </button>
                )}

                {gameState === 'FINISHED' && (
                    <button className="btn-secondary btn-reset" onClick={onResetGame}>
                        🔄 Ván Mới
                    </button>
                )}
            </div>

            {/* Game state indicator */}
            <div className={`game-state-badge state-${gameState.toLowerCase()}`}>
                {gameState === 'WAITING' && '⏳ Chờ bắt đầu'}
                {gameState === 'BETTING' && '💰 Đang đặt cược'}
                {gameState === 'DEALING' && '🃏 Đang chia bài'}
                {gameState === 'PLAYING' && '🎯 Đang chơi'}
                {gameState === 'DEALER_TURN' && '🏦 Lượt Dealer'}
                {gameState === 'SETTLING' && '💵 Thanh toán'}
                {gameState === 'FINISHED' && '✅ Kết thúc'}
            </div>

            {/* Pump chips */}
            <div className="pump-section">
                <button className="btn-pump-toggle" onClick={() => setShowPump(!showPump)}>
                    💊 Bơm Chip {showPump ? '▲' : '▼'}
                </button>

                {showPump && (
                    <div className="pump-form">
                        <select
                            className="pump-select"
                            value={pumpTarget}
                            onChange={e => setPumpTarget(e.target.value)}
                        >
                            <option value="">-- Chọn người chơi --</option>
                            {activePlayers.map(p => (
                                <option key={p.userId} value={p.userId}>
                                    {p.username} ({p.chips.toLocaleString()} chip)
                                </option>
                            ))}
                        </select>

                        <div className="pump-amounts">
                            {[500, 1000, 2000, 5000].map(amt => (
                                <button
                                    key={amt}
                                    className={`pump-amount-btn ${pumpAmount === amt ? 'active' : ''}`}
                                    onClick={() => setPumpAmount(amt)}
                                >
                                    {amt.toLocaleString()}
                                </button>
                            ))}
                        </div>

                        <button
                            className="btn-pump"
                            disabled={!pumpTarget || dealerChips < pumpAmount}
                            onClick={() => {
                                if (pumpTarget) {
                                    onPumpChips(pumpTarget, pumpAmount);
                                    setShowPump(false);
                                    setPumpTarget('');
                                }
                            }}
                        >
                            💊 Bơm {pumpAmount.toLocaleString()} chip
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
