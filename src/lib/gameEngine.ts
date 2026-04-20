import { v4 as uuidv4 } from 'uuid';
import {
    Card, Suit, Rank, Room, Player, Hand, DealerHand, GameState, HandStatus, GameHistory,
    PAYOUT_RULES, DEALER_STAND_VALUE, MAX_HANDS_PER_PLAYER,
    STARTING_CHIPS, DEALER_STARTING_CHIPS, BETTING_TIME
} from './gameTypes';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function createDeck(numDecks = 2): Card[] {
    const deck: Card[] = [];
    for (let d = 0; d < numDecks; d++) {
        for (const suit of SUITS) {
            for (const rank of RANKS) { deck.push({ suit, rank }); }
        }
    }
    return shuffleDeck(deck);
}

export function shuffleDeck(deck: Card[]): Card[] {
    const s = [...deck];
    for (let i = s.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [s[i], s[j]] = [s[j], s[i]];
    }
    return s;
}

export function dealCard(room: Room): { card: Card; room: Room } {
    if (room.deck.length < 20) room = { ...room, deck: createDeck(2) };
    const card = room.deck[0];
    return { card, room: { ...room, deck: room.deck.slice(1) } };
}

export function getCardValue(rank: Rank): number {
    if (['J', 'Q', 'K'].includes(rank)) return 10;
    if (rank === 'A') return 11;
    return parseInt(rank);
}

export function calculateHandScore(cards: Card[]): { score: number; isSoft: boolean } {
    let score = 0; let aces = 0;
    for (const card of cards) {
        if (card.faceDown) continue;
        score += getCardValue(card.rank);
        if (card.rank === 'A') aces++;
    }
    let isSoft = aces > 0;
    while (score > 21 && aces > 0) { score -= 10; aces--; }
    if (aces === 0) isSoft = false;
    return { score, isSoft };
}

export function isBlackjack(cards: Card[]): boolean {
    if (cards.length !== 2) return false;
    const ranks = cards.map(c => c.rank);
    return ranks.includes('A') && ranks.some(r => ['10', 'J', 'Q', 'K'].includes(r));
}

export function isBust(cards: Card[]): boolean {
    return calculateHandScore(cards).score > 21;
}

export function createRoom(roomId: string, roomName: string): Room {
    return {
        roomId, roomName, dealerId: null, players: [],
        deck: createDeck(2), gameState: 'WAITING',
        dealerHand: { cards: [], hideSecond: false },
        currentPlayerIndex: 0, turnOrder: [],
        bettingTimer: BETTING_TIME, bettingTimeLeft: BETTING_TIME,
        history: [], createdAt: Date.now(),
    };
}

export function createPlayer(userId: string, username: string, seatIndex: number, isDealer = false): Player {
    return {
        userId, username,
        chips: isDealer ? DEALER_STARTING_CHIPS : STARTING_CHIPS,
        role: isDealer ? 'DEALER' : 'PLAYER',
        seatIndex, status: 'OCCUPIED', hands: isDealer ? [] : [createHand(0, seatIndex)], activeHandIndex: 0, isConnected: true,
    };
}

export function createHand(bet = 0, seatIndex?: number): Hand {
    return { handId: uuidv4(), cards: [], bet, sideBets: { perfectPairs: 0, poker21: 0 }, status: 'WAITING', isSplit: false, seatIndex };
}

export function placeBet(room: Room, userId: string, handIndex: number, amount: number, type: 'main' | 'perfectPairs' | 'poker21'): Room {
    const newRoom = { ...room };
    const pi = newRoom.players.findIndex(p => p.userId === userId);
    if (pi === -1) return room;
    const player = { ...newRoom.players[pi] };
    if (player.chips < amount) return room;

    if (handIndex >= player.hands.length) return room;

    const hand = { ...player.hands[handIndex] };
    if (type === 'main') hand.bet += amount;
    else if (type === 'perfectPairs') hand.sideBets = { ...hand.sideBets, perfectPairs: hand.sideBets.perfectPairs + amount };
    else hand.sideBets = { ...hand.sideBets, poker21: hand.sideBets.poker21 + amount };

    player.chips -= amount;
    player.hands = [...player.hands];
    player.hands[handIndex] = hand;
    newRoom.players = [...newRoom.players];
    newRoom.players[pi] = player;
    return newRoom;
}

export function clearBet(room: Room, userId: string, handIndex: number): Room {
    const newRoom = { ...room };
    const pi = newRoom.players.findIndex(p => p.userId === userId);
    if (pi === -1) return room;
    const player = { ...newRoom.players[pi] };
    if (handIndex >= player.hands.length) return room;
    const hand = { ...player.hands[handIndex] };
    player.chips += hand.bet + hand.sideBets.perfectPairs + hand.sideBets.poker21;
    hand.bet = 0; hand.sideBets = { perfectPairs: 0, poker21: 0 };
    player.hands = [...player.hands]; player.hands[handIndex] = hand;
    newRoom.players = [...newRoom.players]; newRoom.players[pi] = player;
    return newRoom;
}

export function startBettingPhase(room: Room): Room {
    return {
        ...room, gameState: 'BETTING', bettingTimeLeft: BETTING_TIME,
        dealerHand: { cards: [], hideSecond: false },
        players: room.players.map(p => ({
            ...p,
            hands: p.role === 'PLAYER'
                ? (p.hands.length > 0
                    ? p.hands.filter(h => !h.isSplit).map(h => createHand(0, h.seatIndex))
                    : [createHand(0, p.seatIndex)])
                : [],
            activeHandIndex: 0,
            status: 'OCCUPIED'
        })),
    };
}

// ==== INCREMENTAL DEALING HELPERS ====

export function setupCleanDealingState(room: Room): Room {
    const r = { ...room, gameState: 'DEALING' as GameState };
    // Clear ALL cards before starting a new round and remove hands with no bet
    r.dealerHand = { cards: [], hideSecond: false };
    r.players = r.players.map(p => ({
        ...p,
        hands: p.role === 'DEALER' ? [] : p.hands.filter(h => h.bet > 0).map(h => ({ ...h, cards: [], status: 'WAITING' as HandStatus }))
    }));
    return r;
}

export function dealCardToPlayerHand(room: Room, userId: string, handId: string): Room {
    let r = { ...room };
    const pi = r.players.findIndex(p => p.userId === userId);
    if (pi === -1) return r;
    const { card, room: rr } = dealCard(r); r = rr;
    r.players = r.players.map((p, i) => i === pi ? {
        ...p, hands: p.hands.map(h => h.handId === handId ? { ...h, cards: [...h.cards, card] } : h)
    } : p);
    return r;
}

export function dealCardToDealer(room: Room): Room {
    let r = { ...room };
    const { card, room: rr } = dealCard(r); r = rr;
    r.dealerHand = { ...r.dealerHand, cards: [...r.dealerHand.cards, card] };
    return r;
}

export function finalizeDealingAndStartPlay(room: Room): Room {
    let r = { ...room };
    // Mark blackjacks
    r.players = r.players.map(p => p.role === 'DEALER' ? p : {
        ...p, hands: p.hands.map(h => ({ ...h, status: isBlackjack(h.cards) ? 'BLACKJACK' as HandStatus : h.status }))
    });

    // Turn order: Ascending seatIndex -> Left to Right!
    const ordered = r.players.filter(p => p.role === 'PLAYER' && p.hands.some(h => h.bet > 0))
        .sort((a, b) => a.seatIndex - b.seatIndex);

    r.turnOrder = ordered.map(p => p.userId);
    r.currentPlayerIndex = 0;
    r.gameState = 'PLAYING';

    return advanceToNextActivePlayer(r);
}

function advanceToNextActivePlayer(room: Room): Room {
    let r = { ...room };
    while (r.currentPlayerIndex < r.turnOrder.length) {
        const uid = r.turnOrder[r.currentPlayerIndex];
        const player = r.players.find(p => p.userId === uid);
        if (!player) { r.currentPlayerIndex++; continue; }
        const ahi = player.hands.findIndex(h => h.status === 'WAITING' || h.status === 'ACTIVE');
        if (ahi === -1) { r.currentPlayerIndex++; continue; }
        r.players = r.players.map(p => p.userId === uid
            ? { ...p, activeHandIndex: ahi, hands: p.hands.map((h, i) => i === ahi ? { ...h, status: 'ACTIVE' } : h) } : p);
        return r;
    }
    return startDealerTurn(r);
}

export function playerAction(room: Room, userId: string, action: 'HIT' | 'STAND' | 'DOUBLE' | 'SPLIT'): Room {
    let r = { ...room };
    const pi = r.players.findIndex(p => p.userId === userId);
    if (pi === -1) return room;
    const player = { ...r.players[pi] };
    const hi = player.activeHandIndex;
    const hand = { ...player.hands[hi] };

    const nextHandOrAdvance = (rr: Room, playerIdx: number, handIdx: number): Room => {
        const pl = { ...rr.players[playerIdx] };
        const nhi = pl.hands.findIndex((h, i) => i > handIdx && (h.status === 'WAITING' || h.status === 'ACTIVE'));
        if (nhi !== -1) {
            pl.hands = pl.hands.map((h, i) => i === nhi ? { ...h, status: 'ACTIVE' } : h);
            pl.activeHandIndex = nhi;
            rr.players = rr.players.map((p, i) => i === playerIdx ? pl : p);
            return rr;
        }
        return advanceToNextActivePlayer(rr);
    };

    if (action === 'STAND') {
        hand.status = 'STAND';
        player.hands = player.hands.map((h, i) => i === hi ? hand : h);
        r.players = r.players.map((p, i) => i === pi ? player : p);
        return nextHandOrAdvance(r, pi, hi);
    }

    if (action === 'HIT') {
        const { card, room: rr } = dealCard(r); r = rr;
        hand.cards = [...hand.cards, card];
        const { score } = calculateHandScore(hand.cards);
        if (score > 21) {
            hand.status = 'BUST';
            const di = r.players.findIndex(p => p.role === 'DEALER');
            if (di !== -1) r.players = r.players.map((p, i) => i === di ? { ...p, chips: p.chips + hand.bet } : p);
        } else if (score === 21) {
            hand.status = 'STAND';
        }
        r.players = r.players.map((p, i) => i === pi ? { ...player, hands: player.hands.map((h, i) => i === hi ? hand : h) } : p);
        if (hand.status === 'BUST' || hand.status === 'STAND') return nextHandOrAdvance(r, pi, hi);
        return r;
    }

    if (action === 'DOUBLE') {
        if (hand.cards.length !== 2 || player.chips < hand.bet) return room;
        const { card, room: rr } = dealCard(r); r = rr;
        const extraBet = hand.bet;
        player.chips -= extraBet;
        hand.bet *= 2;
        hand.cards = [...hand.cards, card];
        hand.status = isBust(hand.cards) ? 'BUST' : 'STAND';
        if (hand.status === 'BUST') {
            const di = r.players.findIndex(p => p.role === 'DEALER');
            if (di !== -1) r.players = r.players.map((p, i) => i === di ? { ...p, chips: p.chips + hand.bet } : p);
        }
        r.players = r.players.map((p, i) => i === pi ? { ...player, hands: player.hands.map((h, i) => i === hi ? hand : h) } : p);
        return nextHandOrAdvance(r, pi, hi);
    }

    if (action === 'SPLIT') {
        const canSp = (h: Hand) => h.cards.length === 2 && (h.cards[0].rank === h.cards[1].rank || getCardValue(h.cards[0].rank) === getCardValue(h.cards[1].rank));
        if (!canSp(hand) || player.hands.length >= MAX_HANDS_PER_PLAYER || player.chips < hand.bet) return room;

        const newHand = createHand(hand.bet, hand.seatIndex);
        player.chips -= hand.bet;
        newHand.cards = [hand.cards.pop()!]; // Move one card to newHand

        // Deal 2nd card to both
        let { card: c1, room: r1 } = dealCard(r);
        hand.cards.push(c1);
        let { card: c2, room: r2 } = dealCard(r1); r = r2;
        newHand.cards.push(c2);

        hand.isSplit = true;
        newHand.isSplit = true;
        player.hands = [...player.hands];
        player.hands[hi] = hand;
        player.hands.splice(hi + 1, 0, newHand);
        r.players = r.players.map((p, i) => i === pi ? player : p);
        return r;
    }
    return room;
}

export function startDealerTurn(room: Room): Room {
    const r = { ...room, gameState: 'DEALER_TURN' as GameState };
    const hasActive = r.players.some(p => p.role === 'PLAYER' && p.hands.some(h => h.status !== 'BUST'));
    if (!hasActive) return settleRound(r);
    const { card, room: rr } = dealCard(r);
    rr.dealerHand = { cards: [...r.dealerHand.cards, card], hideSecond: false };
    return rr;
}

export function dealerHit(room: Room): Room {
    let r = { ...room };
    const { score } = calculateHandScore(r.dealerHand.cards);
    if (score >= DEALER_STAND_VALUE) return settleRound(r);
    const { card, room: rr } = dealCard(r); r = rr;
    r.dealerHand = { ...r.dealerHand, cards: [...r.dealerHand.cards, card] };
    const ns = calculateHandScore(r.dealerHand.cards).score;
    if (ns >= DEALER_STAND_VALUE || ns > 21) return settleRound(r);
    return r;
}

export function settleRound(room: Room): Room {
    const r = { ...room, gameState: 'SETTLING' as GameState };
    const dealerScore = calculateHandScore(r.dealerHand.cards).score;
    const dealerBJ = isBlackjack(r.dealerHand.cards);
    const dealerBust = dealerScore > 21;
    let dealerDelta = 0;
    const histResults: GameHistory['results'] = [];

    r.players = r.players.map(player => {
        if (player.role === 'DEALER') return player;
        let playerDelta = 0;
        const hands = player.hands.map(hand => {
            if (hand.status === 'BUST') {
                histResults.push({ username: player.username, result: 'BUST', amount: -hand.bet });
                return { ...hand, result: 'LOSE' as const, payout: 0 };
            }
            const ps = calculateHandScore(hand.cards).score;
            const pbj = isBlackjack(hand.cards);
            let result: Hand['result'] = 'LOSE'; let payout = 0;

            if (pbj && dealerBJ) { result = 'PUSH'; payout = hand.bet; playerDelta += hand.bet; histResults.push({ username: player.username, result: 'PUSH', amount: 0 }); }
            else if (pbj) { result = 'BLACKJACK_WIN'; payout = hand.bet + Math.floor(hand.bet * PAYOUT_RULES.BLACKJACK); playerDelta += payout; dealerDelta -= Math.floor(hand.bet * PAYOUT_RULES.BLACKJACK); histResults.push({ username: player.username, result: 'BLACKJACK', amount: Math.floor(hand.bet * PAYOUT_RULES.BLACKJACK) }); }
            else if (dealerBJ) { result = 'LOSE'; dealerDelta += hand.bet; histResults.push({ username: player.username, result: 'LOSE', amount: -hand.bet }); }
            else if (dealerBust) { result = 'WIN'; payout = hand.bet * 2; playerDelta += payout; dealerDelta -= hand.bet; histResults.push({ username: player.username, result: 'WIN', amount: hand.bet }); }
            else if (ps > dealerScore) { result = 'WIN'; payout = hand.bet * 2; playerDelta += payout; dealerDelta -= hand.bet; histResults.push({ username: player.username, result: 'WIN', amount: hand.bet }); }
            else if (ps === dealerScore) { result = 'PUSH'; payout = hand.bet; playerDelta += hand.bet; histResults.push({ username: player.username, result: 'PUSH', amount: 0 }); }
            else { result = 'LOSE'; dealerDelta += hand.bet; histResults.push({ username: player.username, result: 'LOSE', amount: -hand.bet }); }

            // Side bets
            if (hand.sideBets.perfectPairs > 0) {
                const pp = checkPP(hand.cards);
                if (pp > 0) { playerDelta += hand.sideBets.perfectPairs + hand.sideBets.perfectPairs * pp; dealerDelta -= hand.sideBets.perfectPairs * pp; }
                else dealerDelta += hand.sideBets.perfectPairs;
            }
            if (hand.sideBets.poker21 > 0) {
                const p21 = check21Plus3(hand.cards, r.dealerHand.cards[0]);
                if (p21 > 0) { playerDelta += hand.sideBets.poker21 + hand.sideBets.poker21 * p21; dealerDelta -= hand.sideBets.poker21 * p21; }
                else dealerDelta += hand.sideBets.poker21;
            }
            return { ...hand, result, payout };
        });
        return { ...player, chips: player.chips + playerDelta, hands };
    });

    const di = r.players.findIndex(p => p.role === 'DEALER');
    if (di !== -1) r.players = r.players.map((p, i) => i === di ? { ...p, chips: p.chips + dealerDelta } : p);

    const h: GameHistory = { roundId: uuidv4(), timestamp: Date.now(), dealerScore, results: histResults, dealerWon: dealerDelta > 0 };
    return { ...r, history: [h, ...r.history].slice(0, 10), gameState: 'FINISHED' };
}

function checkPP(cards: Card[]): number {
    if (cards.length < 2) return 0;
    if (cards[0].rank !== cards[1].rank) return 0;
    if (cards[0].suit === cards[1].suit) return PAYOUT_RULES.PERFECT_PAIRS_PERFECT;
    const red = ['hearts', 'diamonds'];
    return (red.includes(cards[0].suit) === red.includes(cards[1].suit)) ? PAYOUT_RULES.PERFECT_PAIRS_COLORED : PAYOUT_RULES.PERFECT_PAIRS_MIXED;
}

function check21Plus3(playerCards: Card[], dealerUp: Card): number {
    if (!dealerUp || playerCards.length < 2) return 0;
    const three = [playerCards[0], playerCards[1], dealerUp];
    const suits = three.map(c => c.suit);
    const ro = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const ri = three.map(c => ro.indexOf(c.rank)).sort((a, b) => a - b);
    const isFlush = suits.every(s => s === suits[0]);
    const isStraight = (ri[2] - ri[1] === 1 && ri[1] - ri[0] === 1) || (ri[0] === 0 && ri[1] === 11 && ri[2] === 12);
    const is3K = three.every(c => c.rank === three[0].rank);
    if (isFlush && is3K) return PAYOUT_RULES.POKER_21_SUITED_3K;
    if (isFlush && isStraight) return PAYOUT_RULES.POKER_21_STRAIGHT_FLUSH;
    if (is3K) return PAYOUT_RULES.POKER_21_THREE_KIND;
    if (isStraight) return PAYOUT_RULES.POKER_21_STRAIGHT;
    if (isFlush) return PAYOUT_RULES.POKER_21_FLUSH;
    return 0;
}

export function pumpChips(room: Room, targetUserId: string, amount: number): Room {
    const di = room.players.findIndex(p => p.role === 'DEALER');
    const ti = room.players.findIndex(p => p.userId === targetUserId);
    if (di === -1 || ti === -1 || room.players[di].chips < amount) return room;
    return {
        ...room, players: room.players.map((p, i) =>
            i === di ? { ...p, chips: p.chips - amount } :
                i === ti ? { ...p, chips: p.chips + amount } : p)
    };
}

export function getActivePlayer(room: Room): Player | null {
    if (room.gameState !== 'PLAYING') return null;
    const uid = room.turnOrder[room.currentPlayerIndex];
    return room.players.find(p => p.userId === uid) || null;
}

export function canDouble(hand: Hand): boolean {
    // Standard rule: Double on any first two cards
    return hand.cards.length === 2;
}

export function canSplit(hand: Hand, playerChips: number): boolean {
    return hand.cards.length === 2 && (hand.cards[0].rank === hand.cards[1].rank || getCardValue(hand.cards[0].rank) === getCardValue(hand.cards[1].rank)) && playerChips >= hand.bet;
}
