'use client';
import React from 'react';
import { CHIP_DENOMINATIONS, GameState, Player } from '@/lib/gameTypes';

interface ChipPickerProps {
    selectedChipValue: number;
    onSelectChip: (v: number) => void;
    playerChips: number;
    gameState: GameState;
    bettingTimeLeft: number;
    isDealer: boolean;
    totalBet: number;
    onStartGame: () => void;
    onClearAllBets: () => void;
    onReset: () => void;
    onDeal: () => void;
    currentPlayer: Player | null;
}

const CHIP_CSS: Record<number, { bg: string; border: string; text: string }> = {
    1: { bg: 'linear-gradient(145deg,#e8e8e8,#bbb)', border: '#aaa', text: '#333' },
    5: { bg: 'linear-gradient(145deg,#e74c3c,#c0392b)', border: '#ff6b6b', text: '#fff' },
    25: { bg: 'linear-gradient(145deg,#27ae60,#1a7a44)', border: '#2ecc71', text: '#fff' },
    100: { bg: 'linear-gradient(145deg,#2980b9,#1a5c8a)', border: '#5dade2', text: '#fff' },
    500: { bg: 'linear-gradient(145deg,#2c3e50,#1a252f)', border: '#7f8c8d', text: '#eee' },
    1000: { bg: 'linear-gradient(145deg,#8e44ad,#5b2c6f)', border: '#a569bd', text: '#fff' },
};

export default function ChipPicker({
    selectedChipValue, onSelectChip, playerChips, gameState,
    bettingTimeLeft, isDealer, totalBet, onStartGame, onClearAllBets, onReset, onDeal, currentPlayer,
}: ChipPickerProps) {
    const canBet = gameState === 'BETTING' || gameState === 'WAITING';
    const isFinished = gameState === 'FINISHED';
    const isPlaying = gameState === 'PLAYING';
    const isDealerTurn = gameState === 'DEALER_TURN';

    const pct = Math.max(0, (bettingTimeLeft / 20) * 100);
    const timerColor = bettingTimeLeft <= 5 ? '#e74c3c' : bettingTimeLeft <= 10 ? '#f39c12' : '#2ecc71';
    const circumference = 2 * Math.PI * 18;

    if (!currentPlayer) return null;

    return (
        <div className="cpicker">

            {/* ── BETTING PHASE ── */}
            {canBet && !isDealer && (
                <>
                    {/* Phase title */}
                    <div className="cpicker-phase">PLACE YOUR BETS</div>

                    {/* Timer + UNDO + Chips + START */}
                    <div className="cpicker-row">

                        {/* Timer circle */}
                        {gameState === 'BETTING' && (
                            <div className="cp-timer">
                                <svg width="44" height="44" viewBox="0 0 44 44">
                                    <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3.5" />
                                    <circle cx="22" cy="22" r="18" fill="none" stroke={timerColor} strokeWidth="3.5"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={circumference * (1 - pct / 100)}
                                        strokeLinecap="round"
                                        transform="rotate(-90 22 22)"
                                        style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s' }}
                                    />
                                    <text x="22" y="27" textAnchor="middle" fill="white" fontSize="13" fontWeight="800">{bettingTimeLeft}</text>
                                </svg>
                            </div>
                        )}

                        {/* UNDO button */}
                        {totalBet > 0 && (
                            <button className="cp-undo" onClick={onClearAllBets} title="Xóa tất cả cược">
                                <span className="undo-icon">↩</span>
                                <span className="undo-txt">UNDO</span>
                            </button>
                        )}

                        {/* CHIPS */}
                        <div className="cp-chips">
                            {CHIP_DENOMINATIONS.map(d => {
                                const st = CHIP_CSS[d.value];
                                const sel = selectedChipValue === d.value;
                                const dis = playerChips < d.value;
                                return (
                                    <button
                                        key={d.value}
                                        className={`cp-chip${sel ? ' cp-chip-sel' : ''}${dis ? ' cp-chip-dis' : ''}`}
                                        disabled={dis}
                                        onClick={() => onSelectChip(d.value)}
                                        style={{
                                            background: st.bg,
                                            border: `3px solid ${sel ? '#fff' : st.border}`,
                                            color: st.text,
                                            boxShadow: sel
                                                ? `0 0 0 3px ${st.border}, 0 6px 20px rgba(0,0,0,0.5)`
                                                : 'inset 0 2px 3px rgba(255,255,255,0.2), 0 4px 10px rgba(0,0,0,0.4)',
                                            transform: sel ? 'translateY(-6px) scale(1.08)' : 'none',
                                        }}
                                    >
                                        <span className="cp-chip-dashes" style={{ borderColor: `${st.text}40` }} />
                                        <span className="cp-chip-lbl">{d.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* START button */}
                        {totalBet > 0 && (
                            <button className="cp-start" onClick={onStartGame}>
                                <span>🃏 BẮT ĐẦU</span>
                                <span className="cp-start-sub">{totalBet.toLocaleString()} chip</span>
                            </button>
                        )}
                    </div>

                    <div className="cpicker-hint">
                        Chip đang chọn: <strong style={{ color: CHIP_CSS[selectedChipValue]?.border }}>{selectedChipValue.toLocaleString()}</strong>
                        &ensp;·&ensp; Click vào ô BET / PP / 21+3 trên bàn để đặt cược
                        &ensp;·&ensp; Số dư: <strong>{playerChips.toLocaleString()}</strong>
                    </div>
                </>
            )}

            {/* ── DEALER VIEW IN BETTING ── */}
            {canBet && isDealer && (
                <div className="cpicker-dealer-wait">
                    <div className="cp-dw-text">
                        {gameState === 'BETTING' && (
                            <svg width="44" height="44" viewBox="0 0 44 44" style={{ marginRight: 12 }}>
                                <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3.5" />
                                <circle cx="22" cy="22" r="18" fill="none" stroke={timerColor} strokeWidth="3.5"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={circumference * (1 - pct / 100)}
                                    strokeLinecap="round" transform="rotate(-90 22 22)"
                                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                                />
                                <text x="22" y="27" textAnchor="middle" fill="white" fontSize="13" fontWeight="800">{bettingTimeLeft}</text>
                            </svg>
                        )}
                        <span>⏳ Đang chờ người chơi đặt cược...</span>
                    </div>
                    <button className="cp-deal-now" onClick={onDeal}>🃏 Chia bài ngay</button>
                </div>
            )}

            {/* ── PLAYING PHASE ── */}
            {isPlaying && (
                <div className="cpicker-playing">
                    <div className="cp-playing-txt">MAKE YOUR DECISION</div>
                </div>
            )}

            {/* ── DEALER TURN ── */}
            {isDealerTurn && (
                <div className="cpicker-dealer-turn">
                    <div className="cp-dt-txt">🏦 Dealer đang rút bài...</div>
                </div>
            )}

            {/* ── FINISHED ── */}
            {isFinished && (
                <div className="cpicker-finished">
                    <button className="cp-new-game" onClick={onReset}>🔄 Ván mới</button>
                </div>
            )}
        </div>
    );
}
