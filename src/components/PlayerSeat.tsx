'use client';
import React from 'react';
import { Player, Hand, GameState } from '@/lib/gameTypes';
import { calculateHandScore, isBlackjack } from '@/lib/gameEngine';
import PlayingCard from './PlayingCard';

interface PlayerSeatProps {
    player: Player;
    spotIndex: number;
    isCurrentUser: boolean;
    isActive: boolean;
    gameState: GameState;
    onAction?: (action: 'HIT' | 'STAND' | 'DOUBLE' | 'SPLIT') => void;
    selectedChipValue: number;
    onBetClick: (handIndex: number, type: 'main' | 'perfectPairs' | 'poker21') => void;
    canBet: boolean; // WAITING or BETTING phase
}

const RESULT_CFG: Record<string, { text: string; cls: string }> = {
    WIN: { text: '🏆 THẮNG', cls: 'rb-win' },
    LOSE: { text: '💀 THUA', cls: 'rb-lose' },
    PUSH: { text: '🤝 HÒA', cls: 'rb-push' },
    BLACKJACK_WIN: { text: '🃏 BLACKJACK!', cls: 'rb-bj' },
    BUST: { text: '💥 QUẮC', cls: 'rb-bust' },
};

function BetCircle({ amount, label, clickable, onClick, size = 'md' }:
    { amount: number; label: string; clickable: boolean; onClick: () => void; size?: 'sm' | 'md' }) {
    return (
        <button
            className={`bet-circle bet-circle-${size}${clickable ? ' bet-circle-active' : ''}${amount > 0 ? ' bet-circle-has-bet' : ''}`}
            onClick={(e) => {
                if (clickable) {
                    e.stopPropagation();
                    onClick();
                }
            }}
            disabled={!clickable}
            title={`${label} — click để đặt`}
        >
            {amount > 0 ? (
                <span className="bc-amount">{amount >= 1000 ? `${(amount / 1000).toFixed(0)}K` : amount}</span>
            ) : (
                <span className="bc-label">{label}</span>
            )}
        </button>
    );
}

function HandCard({ hand, handIdx, isActiveHand, gameState, isCurrentUser, isActive, player, onAction, canBet, selectedChipValue, onBetClick }: {
    hand: Hand; handIdx: number; isActiveHand: boolean; gameState: GameState;
    isCurrentUser: boolean; isActive: boolean; player: Player;
    onAction?: (action: 'HIT' | 'STAND' | 'DOUBLE' | 'SPLIT') => void;
    canBet: boolean; selectedChipValue: number;
    onBetClick: (handIndex: number, type: 'main' | 'perfectPairs' | 'poker21') => void;
}) {
    const { score } = calculateHandScore(hand.cards);
    const bj = isBlackjack(hand.cards);
    const showScore = hand.cards.some(c => !c.faceDown);

    return (
        <div className={`hcard${isActiveHand ? ' hcard-active' : ''}${hand.status === 'BUST' ? ' hcard-bust' : ''}`}>

            {/* === CARDS === */}
            <div className="hcard-cards">
                {hand.cards.length === 0 ? (
                    <div className="hcard-placeholder">
                        {canBet && isCurrentUser ? '↑ click BET để thêm chip' : '—'}
                    </div>
                ) : (
                    <>
                        <div className="hcard-fan">
                            {hand.cards.map((card, ci) => (
                                <PlayingCard
                                    key={ci} card={card}
                                    glow={isActiveHand}
                                    style={{ marginLeft: ci > 0 ? '-20px' : '0', zIndex: ci }}
                                />
                            ))}
                        </div>
                        {showScore && (
                            <div className={`hcard-score${score > 21 ? ' hs-bust' : bj ? ' hs-bj' : score === 21 ? ' hs-21' : ''}`}>
                                {bj ? 'BJ' : score}
                            </div>
                        )}
                    </>
                )}

                {/* Result */}
                {hand.result && gameState === 'FINISHED' && (
                    <div className={`result-badge ${RESULT_CFG[hand.result]?.cls || ''}`}>
                        <div className="rb-text">{RESULT_CFG[hand.result]?.text}</div>
                        {hand.payout !== undefined && hand.payout > 0 && (
                            <div className="rb-payout">+{hand.payout.toLocaleString()}</div>
                        )}
                    </div>
                )}
            </div>

            {/* === BET ZONES ROW === */}
            <div className="bet-zones-row">
                {/* Perfect Pairs (left) */}
                <BetCircle
                    amount={hand.sideBets.perfectPairs}
                    label="PP"
                    clickable={canBet && isCurrentUser}
                    onClick={() => onBetClick(handIdx, 'perfectPairs')}
                    size="sm"
                />

                {/* Main bet (center) */}
                <BetCircle
                    amount={hand.bet}
                    label="BET"
                    clickable={canBet && isCurrentUser}
                    onClick={() => onBetClick(handIdx, 'main')}
                    size="md"
                />

                {/* 21+3 (right) */}
                <BetCircle
                    amount={hand.sideBets.poker21}
                    label="21+3"
                    clickable={canBet && isCurrentUser}
                    onClick={() => onBetClick(handIdx, 'poker21')}
                    size="sm"
                />
            </div>

        </div>
    );
}

export default function PlayerSeat({ player, spotIndex, isCurrentUser, isActive, gameState, onAction, selectedChipValue, onBetClick, canBet }: PlayerSeatProps) {
    const spotHands = player.hands.filter(h => h.seatIndex === spotIndex);
    const getGlobalHandIdx = (handId: string) => player.hands.findIndex(h => h.handId === handId);

    return (
        <div className={`pseat${isCurrentUser ? ' pseat-me' : ''}${isActive ? ' pseat-active' : ''}${!player.isConnected ? ' pseat-offline' : ''}`}>
            {/* Hands in a horizontal row */}
            <div className="pseat-hands">
                {spotHands.map((hand) => {
                    const globalIdx = getGlobalHandIdx(hand.handId);
                    return (
                        <HandCard
                            key={hand.handId}
                            hand={hand} handIdx={globalIdx}
                            isActiveHand={player.activeHandIndex === globalIdx && hand.status === 'ACTIVE'}
                            gameState={gameState}
                            isCurrentUser={isCurrentUser}
                            isActive={isActive}
                            player={player}
                            onAction={onAction}
                            canBet={canBet}
                            selectedChipValue={selectedChipValue}
                            onBetClick={onBetClick}
                        />
                    );
                })}
            </div>

            {/* Info strip (moved below hands) */}
            <div className="pseat-info">
                <div className={`pseat-avatar${isActive && gameState === 'PLAYING' ? ' av-pulse' : ''}`}>
                    {player.username[0].toUpperCase()}
                </div>
                <div className="pseat-meta">
                    <span className="pseat-name">{player.username}{isCurrentUser ? ' (Bạn)' : ''}</span>
                    <span className="pseat-chips">💰 {player.chips.toLocaleString()}</span>
                </div>
                {isActive && gameState === 'PLAYING' && spotHands.some(h => player.activeHandIndex === getGlobalHandIdx(h.handId)) && (
                    <div className="pseat-turn">🎯 LƯỢT</div>
                )}
            </div>
        </div>
    );
}

export function EmptySeat({ seatIndex, onJoin, label }: { seatIndex: number; onJoin: (i: number) => void; label?: string }) {
    return (
        <div className="pseat-empty-btn" onClick={() => onJoin(seatIndex)}>
            <span className="join-txt">{label || `+ Ghế ${seatIndex}`}</span>
        </div>
    );
}
