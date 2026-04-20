'use client';
import React from 'react';
import { DealerHand } from '@/lib/gameTypes';
import { calculateHandScore, isBlackjack } from '@/lib/gameEngine';
import PlayingCard from './PlayingCard';

interface DealerAreaProps {
    dealerHand: DealerHand;
    dealerChips: number;
    gameState: string;
    dealerName: string;
}

export default function DealerArea({ dealerHand, dealerChips, gameState, dealerName }: DealerAreaProps) {
    const visibleCards = dealerHand.cards.filter(c => !c.faceDown);
    const { score } = calculateHandScore(dealerHand.cards);
    const bj = isBlackjack(dealerHand.cards);

    return (
        <div className="dealer-row">
            {/* Deck visual on left */}
            <div className="dealer-deck-col">
                <div className="deck-stack">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="deck-card-visual" style={{ bottom: i * 3, zIndex: i }} />
                    ))}
                </div>
                <span className="deck-lbl">2 bộ bài</span>
            </div>

            {/* Dealer cards center */}
            <div className="dealer-cards-col">
                <div className="dealer-title-bar">
                    <span className="dealer-crown-icon">♛</span>
                    <span className="dealer-name-txt">DEALER – {dealerName}</span>
                    <span className="dealer-chips-txt">🏦 {dealerChips.toLocaleString()}</span>
                </div>

                <div className="dealer-cards-fan">
                    {dealerHand.cards.length === 0 ? (
                        <div className="dealer-no-cards">Chưa chia bài</div>
                    ) : (
                        dealerHand.cards.map((card, idx) => (
                            <PlayingCard
                                key={idx}
                                card={card}
                                glow={gameState === 'DEALER_TURN'}
                                style={{ marginLeft: idx > 0 ? '-22px' : '0', zIndex: idx }}
                            />
                        ))
                    )}
                </div>

                {visibleCards.length > 0 && (
                    <div className={`dealer-score-tag${score > 21 ? ' ds-bust' : bj ? ' ds-bj' : ''}`}>
                        {bj ? '🃏 BLACKJACK!' : score > 21 ? `💥 ${score} - QUẮC!` : `${score} điểm`}
                    </div>
                )}
            </div>
        </div>
    );
}
