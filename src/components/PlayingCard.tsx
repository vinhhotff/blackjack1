'use client';
import React from 'react';
import { Card as CardType } from '@/lib/gameTypes';

interface PlayingCardProps {
    card: CardType;
    small?: boolean;
    glow?: boolean;
    style?: React.CSSProperties;
}

const SUIT_SYMBOLS: Record<string, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
};

export default function PlayingCard({ card, small = false, glow = false, style }: PlayingCardProps) {
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

    if (card.faceDown) {
        return (
            <div
                className={`playing-card card-back-face${small ? ' card-sm' : ''}${glow ? ' card-glow' : ''}`}
                style={style}
            >
                <div className="card-back-design" />
            </div>
        );
    }

    const suit = SUIT_SYMBOLS[card.suit] || card.suit;
    const colorClass = isRed ? 'card-red' : 'card-black';

    return (
        <div
            className={`playing-card ${colorClass}${small ? ' card-sm' : ''}${glow ? ' card-glow' : ''}`}
            style={style}
        >
            <div className="card-top-left">
                <div className="card-rank-text">{card.rank}</div>
                <div className="card-suit-text">{suit}</div>
            </div>
            <div className="card-center-symbol">{suit}</div>
            <div className="card-bottom-right">
                <div className="card-rank-text">{card.rank}</div>
                <div className="card-suit-text">{suit}</div>
            </div>
        </div>
    );
}
