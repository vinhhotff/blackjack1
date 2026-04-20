'use client';
import React from 'react';
import { GameHistory } from '@/lib/gameTypes';

interface HistoryPanelProps {
    history: GameHistory[];
}

export default function HistoryPanel({ history }: HistoryPanelProps) {
    if (history.length === 0) return (
        <div className="history-panel">
            <div className="history-header">📜 Lịch sử ván</div>
            <div className="history-empty">Chưa có ván nào</div>
        </div>
    );

    return (
        <div className="history-panel">
            <div className="history-header">📜 Lịch sử ({history.length} ván)</div>
            <div className="history-list">
                {history.map((h, idx) => (
                    <div key={h.roundId} className={`history-item ${h.dealerWon ? 'dealer-won' : 'player-won'}`}>
                        <div className="history-round">
                            <span className="history-num">#{history.length - idx}</span>
                            <span className={`history-badge ${h.dealerWon ? 'badge-dealer' : 'badge-player'}`}>
                                {h.dealerWon ? '🏦 Dealer thắng' : '🎉 Player thắng'}
                            </span>
                            <span className="history-dealer-score">Dealer: {h.dealerScore > 21 ? '💥' : h.dealerScore}</span>
                        </div>
                        <div className="history-results">
                            {h.results.slice(0, 4).map((r, i) => (
                                <span key={i} className={`history-result-tag ${r.result === 'WIN' || r.result === 'BLACKJACK' ? 'tag-win' : r.result === 'PUSH' ? 'tag-push' : 'tag-lose'}`}>
                                    {r.username}: {r.result} {r.amount > 0 ? `+${r.amount}` : r.amount}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
