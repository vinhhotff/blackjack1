import { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { Room, ChatMessage, BETTING_TIME } from './gameTypes';
import {
    createRoom, createPlayer, createHand, startBettingPhase, placeBet, clearBet,
    setupCleanDealingState, dealCardToPlayerHand, dealCardToDealer, finalizeDealingAndStartPlay,
    playerAction, dealerHit, pumpChips, getActivePlayer,
} from './gameEngine';

const rooms = new Map<string, Room>();
const bettingTimers = new Map<string, ReturnType<typeof setInterval>>();
let io: SocketIOServer | null = null;

// Trigger Hot Reload: FORCE COMPLETE MEMORY NUKE 123
rooms.clear();

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export function initSocketServer(httpServer: any) {
    if (io) return io;

    io = new SocketIOServer(httpServer, {
        cors: { origin: '*', methods: ['GET', 'POST'] },
        transports: ['websocket', 'polling'],
    });

    rooms.set('main', createRoom('main', 'Bàn Chơi Chính'));

    io.on('connection', (socket: Socket) => {
        socket.on('joinRoom', ({ roomId, username, seatIndex }: { roomId: string; username: string; seatIndex?: number }) => {
            let room = rooms.get(roomId) || createRoom(roomId, `Bàn ${roomId}`);
            rooms.set(roomId, room);

            if (room.players.find(p => p.userId === socket.id)) {
                socket.join(roomId);
                socket.emit('roomState', room);
                return;
            }

            let assignedSeat = seatIndex;
            if (assignedSeat === undefined) {
                const occ = new Set(room.players.map(p => p.seatIndex));
                for (let i = 1; i <= 6; i++) { if (!occ.has(i)) { assignedSeat = i; break; } }
                if (assignedSeat === undefined) { socket.emit('error', { message: 'Bàn đã đầy!' }); return; }
            }

            const isDealer = assignedSeat === 0;
            if (isDealer && room.dealerId) { socket.emit('error', { message: 'Đã có Dealer!' }); return; }

            const player = createPlayer(socket.id, username, assignedSeat, isDealer);
            room = { ...room, players: [...room.players, player] };
            if (isDealer) room = { ...room, dealerId: socket.id };

            rooms.set(roomId, room);
            socket.join(roomId);
            socket.data.roomId = roomId;
            socket.data.userId = socket.id;

            io!.to(roomId).emit('roomState', room);
            broadcast(roomId, `${username} đã vào bàn!`, 'system');
        });

        socket.on('placeBet', ({ roomId, handIndex, amount, type }: { roomId: string; handIndex: number; amount: number; type: 'main' | 'perfectPairs' | 'poker21' }) => {
            let room = rooms.get(roomId);
            if (!room || (room.gameState !== 'BETTING' && room.gameState !== 'WAITING')) return;
            if (room.gameState === 'WAITING') room = startBettingPhase(room);
            room = placeBet(room, socket.id, handIndex, amount, type);
            rooms.set(roomId, room);
            io!.to(roomId).emit('roomState', room);
        });

        socket.on('claimSeat', ({ roomId, seatIndex }: { roomId: string; seatIndex: number }) => {
            let room = rooms.get(roomId);
            if (!room || (room.gameState !== 'WAITING' && room.gameState !== 'BETTING')) return;
            const player = room.players.find(p => p.userId === socket.id);
            if (!player || player.role !== 'PLAYER') return;

            const isTaken = room.players.some(p => p.hands.some(h => h.seatIndex === seatIndex));
            if (isTaken || player.hands.length >= 3) return; // Max 3 hands or taken

            const newHand = {
                handId: uuidv4(), cards: [], bet: 0,
                sideBets: { perfectPairs: 0, poker21: 0 },
                status: 'WAITING' as const, isSplit: false, seatIndex
            };

            room = {
                ...room,
                players: room.players.map(p => p.userId === player.userId ? { ...p, hands: [...p.hands, newHand] } : p)
            };
            rooms.set(roomId, room);
            io!.to(roomId).emit('roomState', room);
        });

        socket.on('clearBet', ({ roomId, handIndex }: { roomId: string; handIndex: number }) => {
            let room = rooms.get(roomId);
            if (!room || (room.gameState !== 'BETTING' && room.gameState !== 'WAITING')) return;
            room = clearBet(room, socket.id, handIndex);
            rooms.set(roomId, room);
            io!.to(roomId).emit('roomState', room);
        });

        socket.on('startGame', async ({ roomId }: { roomId: string }) => {
            let room = rooms.get(roomId);
            if (!room) return;
            if (room.gameState !== 'WAITING' && room.gameState !== 'BETTING') return;

            const hasBets = room.players.some(p => p.role === 'PLAYER' && p.hands.some(h => h.bet > 0));
            if (!hasBets) { socket.emit('error', { message: 'Ít nhất một người phải đặt cược!' }); return; }

            clearBettingTimer(roomId);
            if (room.gameState === 'WAITING') room = startBettingPhase(room);

            broadcast(roomId, 'Bắt đầu chia bài... 🃏', 'game');
            await performSequentialDeal(roomId);
        });

        socket.on('dealCards', async ({ roomId }: { roomId: string }) => {
            let room = rooms.get(roomId);
            if (!room || (room.gameState !== 'BETTING' && room.gameState !== 'WAITING')) return;
            clearBettingTimer(roomId);
            if (room.gameState === 'WAITING') room = startBettingPhase(room);

            broadcast(roomId, 'Bắt đầu chia bài... 🃏', 'game');
            await performSequentialDeal(roomId);
        });

        socket.on('playerAction', ({ roomId, action }: { roomId: string; action: 'HIT' | 'STAND' | 'DOUBLE' | 'SPLIT' }) => {
            let room = rooms.get(roomId);
            if (!room || room.gameState !== 'PLAYING') return;
            const active = getActivePlayer(room);
            if (!active || active.userId !== socket.id) { socket.emit('error', { message: 'Không phải lượt của bạn!' }); return; }
            room = playerAction(room, socket.id, action);
            rooms.set(roomId, room);
            io!.to(roomId).emit('roomState', room);
            if (room.gameState === 'DEALER_TURN') scheduleDealerAuto(roomId);
            if (room.gameState === 'FINISHED') io!.to(roomId).emit('roundFinished', room);
        });

        socket.on('pumpChips', ({ roomId, targetUserId, amount }: { roomId: string; targetUserId: string; amount: number }) => {
            let room = rooms.get(roomId);
            if (!room || room.dealerId !== socket.id) return;
            room = pumpChips(room, targetUserId, amount);
            rooms.set(roomId, room);
            const target = room.players.find(p => p.userId === targetUserId);
            io!.to(roomId).emit('roomState', room);
            broadcast(roomId, `Dealer bơm ${amount.toLocaleString()} chip cho ${target?.username}! 💰`, 'system');
        });

        socket.on('kickPlayer', ({ roomId, targetUserId }: { roomId: string; targetUserId: string }) => {
            let room = rooms.get(roomId);
            if (!room || room.dealerId !== socket.id) return;
            const target = room.players.find(p => p.userId === targetUserId);
            if (!target) return;
            room = { ...room, players: room.players.filter(p => p.userId !== targetUserId) };
            rooms.set(roomId, room);
            io!.to(roomId).emit('roomState', room);
            broadcast(roomId, `🚨 ${target.username} đã bị Dealer mời ra khỏi bàn.`, 'system');
        });

        socket.on('forceReset', ({ roomId }: { roomId: string }) => {
            let room = rooms.get(roomId);
            if (!room || room.dealerId !== socket.id) return;
            clearBettingTimer(roomId);

            // Refund all bets
            const refundedPlayers = room.players.map(p => {
                const refund = p.hands.reduce((sum, h) => sum + h.bet + h.sideBets.perfectPairs + h.sideBets.poker21, 0);
                return {
                    ...p,
                    chips: p.chips + refund,
                    hands: p.role === 'PLAYER' ? p.hands.filter(h => !h.isSplit).map(h => createHand(0, h.seatIndex)) : [],
                    status: 'OCCUPIED' as const
                };
            });

            room = {
                ...room,
                gameState: 'WAITING',
                players: refundedPlayers,
                dealerHand: { cards: [], hideSecond: false }
            };
            rooms.set(roomId, room);
            io!.to(roomId).emit('roomState', room);
            broadcast(roomId, '⚠️ Dealer đã hủy và khởi tạo lại ván chơi!', 'system');
        });

        socket.on('resetGame', ({ roomId }: { roomId: string }) => {
            let room = rooms.get(roomId);
            if (!room || room.gameState !== 'FINISHED') return;
            room = { ...room, gameState: 'WAITING' };
            rooms.set(roomId, room);
            io!.to(roomId).emit('roomState', room);
            broadcast(roomId, 'Ván mới bắt đầu! Mời đặt cược. 🎲', 'game');
        });

        socket.on('nukeServer', () => {
            rooms.clear();
            rooms.set('main', createRoom('main', 'Bàn Chơi Chính'));
            io!.emit('chatMessage', { id: uuidv4(), userId: 'system', username: 'Hệ thống', message: 'Tất cả dữ liệu đã bị xóa trắng. Vui lòng F5 tải lại trang!', timestamp: Date.now(), type: 'system' });
        });

        socket.on('sendChat', ({ roomId, message }: { roomId: string; message: string }) => {
            const room = rooms.get(roomId);
            if (!room) return;
            const player = room.players.find(p => p.userId === socket.id);
            if (!player) return;
            broadcast(roomId, message, 'chat', socket.id, player.username);
        });

        socket.on('disconnect', () => {
            const roomId = socket.data.roomId;
            if (!roomId) return;
            let room = rooms.get(roomId);
            if (!room) return;
            const player = room.players.find(p => p.userId === socket.id);
            if (!player) return;
            broadcast(roomId, `${player.username} đã rời bàn.`, 'system');

            if (room.gameState === 'WAITING' || room.gameState === 'FINISHED') {
                room = { ...room, players: room.players.filter(p => p.userId !== socket.id) };
                if (room.dealerId === socket.id) room = { ...room, dealerId: null };
            } else {
                if (room.dealerId === socket.id) {
                    // Dealer left mid-game. Force reset, refund bets, free dealer seat.
                    clearBettingTimer(roomId);
                    const refundedPlayers = room.players.map(p => {
                        if (p.userId === socket.id) return p;
                        const refund = p.hands.reduce((sum, h) => sum + h.bet + h.sideBets.perfectPairs + h.sideBets.poker21, 0);
                        return {
                            ...p,
                            chips: p.chips + refund,
                            hands: p.role === 'PLAYER' ? p.hands.filter(h => !h.isSplit).map(h => createHand(0, h.seatIndex)) : [],
                            status: 'OCCUPIED' as const
                        };
                    }).filter(p => p.userId !== socket.id);

                    room = {
                        ...room,
                        gameState: 'WAITING',
                        players: refundedPlayers,
                        dealerId: null,
                        dealerHand: { cards: [], hideSecond: false }
                    };
                    broadcast(roomId, `🚨 Ván chơi đã bị hủy vì Dealer vừa mất kết nối/thoát khỏi bàn!`, 'system');
                } else {
                    room = { ...room, players: room.players.map(p => p.userId === socket.id ? { ...p, isConnected: false } : p) };
                }
            }

            rooms.set(roomId, room);
            io?.to(roomId).emit('roomState', room);
        });
    });

    return io;
}

async function performSequentialDeal(roomId: string) {
    let room = rooms.get(roomId);
    if (!room) return;

    room = setupCleanDealingState(room);
    rooms.set(roomId, room);
    io?.to(roomId).emit('roomState', room);

    // Determine active players left-to-right (ascending seatIndex)
    const playersLeftToRight = room.players
        .filter(p => p.role === 'PLAYER' && p.hands.some(h => h.bet > 0))
        .sort((a, b) => a.seatIndex - b.seatIndex);

    const DEAL_DELAY_MS = 400; // Delay between cards

    // Round 1: Deal 1st card to each player hand
    for (const p of playersLeftToRight) {
        for (const h of p.hands) {
            if (h.bet <= 0) continue;
            await delay(DEAL_DELAY_MS);
            room = rooms.get(roomId)!; // refresh state
            room = dealCardToPlayerHand(room, p.userId, h.handId);
            rooms.set(roomId, room);
            io?.to(roomId).emit('roomState', room);
        }
    }

    // Deal 1st card to dealer
    await delay(DEAL_DELAY_MS);
    room = rooms.get(roomId)!;
    room = dealCardToDealer(room);
    rooms.set(roomId, room);
    io?.to(roomId).emit('roomState', room);

    // Round 2: Deal 2nd card to each player hand
    for (const p of playersLeftToRight) {
        for (const h of p.hands) {
            if (h.bet <= 0) continue;
            await delay(DEAL_DELAY_MS);
            room = rooms.get(roomId)!;
            room = dealCardToPlayerHand(room, p.userId, h.handId);
            rooms.set(roomId, room);
            io?.to(roomId).emit('roomState', room);
        }
    }

    // Finalize
    await delay(DEAL_DELAY_MS);
    room = rooms.get(roomId)!;
    room = finalizeDealingAndStartPlay(room);
    rooms.set(roomId, room);
    io?.to(roomId).emit('roomState', room);

    if (room.gameState === 'DEALER_TURN') scheduleDealerAuto(roomId);
}

function broadcast(roomId: string, message: string, type: ChatMessage['type'], userId?: string, username?: string) {
    const msg: ChatMessage = { id: uuidv4(), userId: userId || 'system', username: username || 'Hệ thống', message, timestamp: Date.now(), type };
    io?.to(roomId).emit('chatMessage', msg);
}

function clearBettingTimer(roomId: string) {
    const t = bettingTimers.get(roomId);
    if (t) { clearInterval(t); bettingTimers.delete(roomId); }
}

function scheduleDealerAuto(roomId: string) {
    const autoPlay = () => {
        const r = rooms.get(roomId);
        if (!r || r.gameState !== 'DEALER_TURN') return;
        const upd = dealerHit(r);
        rooms.set(roomId, upd);
        io?.to(roomId).emit('roomState', upd);
        if (upd.gameState === 'DEALER_TURN') setTimeout(autoPlay, 1200);
        else io?.to(roomId).emit('roundFinished', upd);
    };
    setTimeout(autoPlay, 1500);
}

export function getIO() { return io; }
export function getRooms() { return rooms; }
