'use client';
import React from 'react';
import { CHIP_DENOMINATIONS, ChipColor } from '@/lib/gameTypes';

interface ChipProps {
    value: number;
    size?: 'sm' | 'md' | 'lg';
    onClick?: () => void;
    disabled?: boolean;
    count?: number;
    selected?: boolean;
}

const CHIP_BG: Record<ChipColor, string> = {
    white: 'linear-gradient(145deg, #f0f0f0, #d0d0d0)',
    red: 'linear-gradient(145deg, #e74c3c, #c0392b)',
    green: 'linear-gradient(145deg, #27ae60, #1e8449)',
    blue: 'linear-gradient(145deg, #2980b9, #1a5276)',
    black: 'linear-gradient(145deg, #2c3e50, #1a252f)',
    purple: 'linear-gradient(145deg, #8e44ad, #6c3483)',
};

const CHIP_BORDER: Record<ChipColor, string> = {
    white: '#bbb',
    red: '#e74c3c',
    green: '#27ae60',
    blue: '#2980b9',
    black: '#555',
    purple: '#8e44ad',
};

const CHIP_TEXT: Record<ChipColor, string> = {
    white: '#333',
    red: '#fff',
    green: '#fff',
    blue: '#fff',
    black: '#f0f0f0',
    purple: '#fff',
};

export default function Chip({ value, size = 'md', onClick, disabled, count, selected }: ChipProps) {
    const denom = CHIP_DENOMINATIONS.find(d => d.value === value) || CHIP_DENOMINATIONS[0];
    const sizeClass = size === 'sm' ? 'chip-sm' : size === 'lg' ? 'chip-lg' : 'chip-md';

    return (
        <button
            className={`chip ${sizeClass} ${selected ? 'chip-selected' : ''} ${disabled ? 'chip-disabled' : ''}`}
            onClick={onClick}
            disabled={disabled}
            style={{
                background: CHIP_BG[denom.color],
                borderColor: CHIP_BORDER[denom.color],
                color: CHIP_TEXT[denom.color],
                boxShadow: selected
                    ? `0 0 0 3px #fff, 0 0 0 5px ${CHIP_BORDER[denom.color]}, 0 4px 15px rgba(0,0,0,0.5)`
                    : `inset 0 2px 4px rgba(255,255,255,0.3), 0 4px 8px rgba(0,0,0,0.4)`,
            }}
        >
            <div className="chip-dashes" style={{ borderColor: CHIP_TEXT[denom.color] + '60' }} />
            <span className="chip-label">{denom.label}</span>
            {count !== undefined && count > 0 && (
                <span className="chip-count">×{count}</span>
            )}
        </button>
    );
}

interface ChipStackProps {
    amount: number;
    size?: 'sm' | 'md';
}

export function ChipStack({ amount, size = 'sm' }: ChipStackProps) {
    // Decompose amount into chip denominations
    const chips: { value: number; color: ChipColor; count: number }[] = [];
    let remaining = amount;
    const denoms = [...CHIP_DENOMINATIONS].reverse();
    for (const d of denoms) {
        if (remaining >= d.value) {
            const count = Math.min(Math.floor(remaining / d.value), 5);
            if (count > 0) {
                chips.push({ value: d.value, color: d.color, count });
                remaining -= count * d.value;
            }
        }
    }

    return (
        <div className="chip-stack-container">
            {chips.map((c, i) => (
                <div key={i} className="chip-stack-group">
                    {Array.from({ length: Math.min(c.count, 3) }).map((_, j) => (
                        <div
                            key={j}
                            className={`chip chip-stacked ${size === 'sm' ? 'chip-sm' : 'chip-md'}`}
                            style={{
                                background: CHIP_BG[c.color],
                                borderColor: CHIP_BORDER[c.color],
                                bottom: `${j * 3}px`,
                                position: j === 0 ? 'relative' : 'absolute',
                                zIndex: j,
                            }}
                        />
                    ))}
                </div>
            ))}
            {amount > 0 && <span className="chip-stack-total">{amount.toLocaleString()}</span>}
        </div>
    );
}
