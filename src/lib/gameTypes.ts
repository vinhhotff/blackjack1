// ==================== CARD TYPES ====================
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
    suit: Suit;
    rank: Rank;
    faceDown?: boolean;
}

// ==================== CHIP TYPES ====================
export type ChipColor = 'white' | 'red' | 'green' | 'blue' | 'black' | 'purple';

export interface ChipDenomination {
    value: number;
    color: ChipColor;
    label: string;
}

export const CHIP_DENOMINATIONS: ChipDenomination[] = [
    { value: 1, color: 'white', label: '1' },
    { value: 5, color: 'red', label: '5' },
    { value: 25, color: 'green', label: '25' },
    { value: 100, color: 'blue', label: '100' },
    { value: 500, color: 'black', label: '500' },
    { value: 1000, color: 'purple', label: '1K' },
];

// ==================== HAND TYPES ====================
export type HandStatus = 'WAITING' | 'ACTIVE' | 'STAND' | 'BUST' | 'BLACKJACK' | 'DOUBLE' | 'SPLIT';

export interface Hand {
    handId: string;
    cards: Card[];
    bet: number;
    sideBets: {
        perfectPairs: number;
        poker21: number;
    };
    status: HandStatus;
    result?: 'WIN' | 'LOSE' | 'PUSH' | 'BLACKJACK_WIN' | 'SIDE_WIN';
    payout?: number;
    isSplit?: boolean;
    seatIndex?: number;
}

// ==================== PLAYER TYPES ====================
export type PlayerRole = 'DEALER' | 'PLAYER';
export type SeatStatus = 'EMPTY' | 'OCCUPIED' | 'READY';

export interface Player {
    userId: string;
    username: string;
    chips: number;
    role: PlayerRole;
    seatIndex: number;
    status: SeatStatus;
    hands: Hand[];
    activeHandIndex: number;
    isConnected: boolean;
}

// ==================== GAME STATE TYPES ====================
export type GameState = 'WAITING' | 'BETTING' | 'DEALING' | 'PLAYING' | 'DEALER_TURN' | 'SETTLING' | 'FINISHED';

export interface DealerHand {
    cards: Card[];
    hideSecond?: boolean;
}

export interface GameHistory {
    roundId: string;
    timestamp: number;
    dealerScore: number;
    results: { username: string; result: string; amount: number }[];
    dealerWon: boolean;
}

export interface Room {
    roomId: string;
    roomName: string;
    dealerId: string | null;
    players: Player[];
    deck: Card[];
    gameState: GameState;
    dealerHand: DealerHand;
    currentPlayerIndex: number;
    turnOrder: string[];
    bettingTimer: number;
    bettingTimeLeft: number;
    history: GameHistory[];
    createdAt: number;
}

// ==================== SOCKET EVENT TYPES ====================
export interface ChatMessage {
    id: string;
    userId: string;
    username: string;
    message: string;
    timestamp: number;
    type: 'chat' | 'system' | 'game';
}

export type PlayerAction = 'HIT' | 'STAND' | 'DOUBLE' | 'SPLIT';

export interface PlaceBetPayload {
    roomId: string;
    seatIndex: number;
    handIndex: number;
    amount: number;
    type: 'main' | 'perfectPairs' | 'poker21';
}

export interface PlayerActionPayload {
    roomId: string;
    action: PlayerAction;
}

export interface JoinRoomPayload {
    roomId: string;
    username: string;
    seatIndex?: number;
}

// ==================== PAYOUT CONSTANTS ====================
export const PAYOUT_RULES = {
    BLACKJACK: 1.5,
    WIN: 1,
    PUSH: 0,
    LOSE: -1,
    PERFECT_PAIRS_PERFECT: 25,
    PERFECT_PAIRS_COLORED: 12,
    PERFECT_PAIRS_MIXED: 6,
    POKER_21_SUITED_3K: 100,
    POKER_21_STRAIGHT_FLUSH: 40,
    POKER_21_THREE_KIND: 30,
    POKER_21_STRAIGHT: 10,
    POKER_21_FLUSH: 5,
};

export const BETTING_TIME = 20;
export const DEALER_STAND_VALUE = 17;
export const MAX_PLAYERS = 6;
export const MAX_HANDS_PER_PLAYER = 3;
export const STARTING_CHIPS = 5000;
export const DEALER_STARTING_CHIPS = 100000;
