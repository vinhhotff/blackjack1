'use client';
import React, { useState, useCallback } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { getActivePlayer, getCardValue } from '@/lib/gameEngine';
import PlayerSeat, { EmptySeat } from './PlayerSeat';
import DealerArea from './DealerArea';
import ChipPicker from './BettingPanel';
import ChatPanel from './ChatPanel';
import HistoryPanel from './HistoryPanel';

// Positioning for an arc (casino table layout)
const SEATS_POS = [
    { left: '12%', top: '55%' }, // Seat 1
    { left: '26%', top: '75%' }, // Seat 2
    { left: '42.5%', top: '85%' }, // Seat 3
    { left: '57.5%', top: '85%' }, // Seat 4
    { left: '74%', top: '75%' }, // Seat 5
    { left: '88%', top: '55%' }, // Seat 6
];

export default function GameTable() {
    const { socket, room, messages, bettingTimeLeft, userId } = useSocket();
    const [selectedChip, setSelectedChip] = useState(25);

    const currentPlayer = room?.players.find(p => p.userId === userId);
    const isDealer = currentPlayer?.role === 'DEALER';
    const dealerPlayer = room?.players.find(p => p.role === 'DEALER');
    const activePlayer = room ? getActivePlayer(room) : null;

    const canBet = room?.gameState === 'WAITING' || room?.gameState === 'BETTING';

    // Table spots 1-6 (fixed positions on felt)
    const tableSpots = Array.from({ length: 6 }, (_, i) => {
        const seatIndex = i + 1;
        const player = room?.players.find(p => p.role === 'PLAYER' && p.hands.some(h => h.seatIndex === seatIndex));
        return { seatIndex, player: player || null };
    });

    const totalBet = currentPlayer?.hands.reduce(
        (s, h) => s + h.bet + h.sideBets.perfectPairs + h.sideBets.poker21, 0) || 0;

    const emit = useCallback((event: string, data: object) => {
        if (!socket || !room) return;
        socket.emit(event, { roomId: room.roomId, ...data });
    }, [socket, room]);

    const handleJoin = useCallback((seatIndex: number) => {
        if (!socket || !room) return;
        if (currentPlayer) {
            // Already in room, add an extra hand box!
            socket.emit('claimSeat', { roomId: room.roomId, seatIndex });
            return;
        }
        const username = prompt('Nhập tên của bạn:');
        if (!username?.trim()) return;
        socket.emit('joinRoom', { roomId: room.roomId, username: username.trim(), seatIndex });
    }, [socket, room, currentPlayer]);

    const handleBetClick = useCallback((handIndex: number, type: 'main' | 'perfectPairs' | 'poker21') => {
        emit('placeBet', { handIndex, amount: selectedChip, type });
    }, [emit, selectedChip]);

    const handleClearAll = useCallback(() => {
        if (!currentPlayer) return;
        currentPlayer.hands.forEach((_, idx) => emit('clearBet', { handIndex: idx }));
    }, [emit, currentPlayer]);

    const handleStartGame = useCallback(() => emit('startGame', {}), [emit]);
    const handleAction = useCallback((action: 'HIT' | 'STAND' | 'DOUBLE' | 'SPLIT') => emit('playerAction', { action }), [emit]);
    const handleReset = useCallback(() => emit('resetGame', {}), [emit]);
    const handleChat = useCallback((message: string) => emit('sendChat', { message }), [emit]);
    const handleDeal = useCallback(() => emit('dealCards', {}), [emit]);
    const handlePump = useCallback((targetUserId: string, amount: number) => emit('pumpChips', { targetUserId, amount }), [emit]);
    const handleKick = useCallback((targetUserId: string) => emit('kickPlayer', { targetUserId }), [emit]);
    const handleForceReset = useCallback(() => {
        if (window.confirm('Bạn có chắc chắn muốn HỦY ván này và reset lại từ đầu? Tất cả tiền cược sẽ được hoàn trả.')) {
            emit('forceReset', {});
        }
    }, [emit]);

    const handleNukeServer = useCallback(() => {
        if (window.confirm('CẢNH BÁO: Hành động này sẽ TẮT TOÀN BỘ BÀN, ĐUỔI TẤT CẢ MỌI NGƯỜI VÀ XÓA SẠCH SERVER! Bạn có đồng ý?')) {
            emit('nukeServer', {});
            setTimeout(() => window.location.reload(), 1000);
        }
    }, [emit]);

    if (!room) {
        return (
            <div className="tbl-loading">
                {/* GLOBAL NUKE BUTTON FOR LOCKED OUT USERS */}
                <button
                    onClick={handleNukeServer}
                    style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000, background: 'rgba(231,76,60,0.8)', border: '2px solid #c0392b', color: 'white', fontWeight: 'bold', padding: '10px 15px', borderRadius: '10px', cursor: 'pointer', boxShadow: '0 0 15px red' }}
                >
                    ☢️ NUKE (XÓA SẠCH DATA)
                </button>
                <div className="loading-spin" />
                <p>Đang kết nối... (Nếu bàn đầy hoặc lỗi, bấm nút đỏ góc trên)</p>
            </div>
        );
    }

    return (
        <div className="game-layout">

            {/* GLOBAL NUKE BUTTON (TOP LEFT CORNER) */}
            <button
                onClick={handleNukeServer}
                style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000, background: 'rgba(231,76,60,0.8)', border: '2px solid #c0392b', color: 'white', fontWeight: 'bold', padding: '10px 15px', borderRadius: '10px', cursor: 'pointer', boxShadow: '0 0 15px red' }}
            >
                ☢️ NUKE (XÓA SẠCH DATA)
            </button>

            {/* ─── LEFT SIDEBAR ─── */}
            <div className="sidebar sidebar-left">
                <HistoryPanel history={room.history} />

                {/* Dealer Admin panel */}
                {isDealer && dealerPlayer && (
                    <DealerAdminPanel
                        players={room.players}
                        dealerChips={dealerPlayer.chips}
                        onPump={handlePump}
                        onKick={handleKick}
                        onForceReset={handleForceReset}
                        gameState={room.gameState}
                        onDeal={handleDeal}
                        onReset={handleReset}
                        canBet={canBet}
                    />
                )}
            </div>

            {/* ─── MAIN TABLE ─── */}
            <div className="table-wrap">
                <div className="felt-table">

                    {/* DEALER AREA — top center */}
                    <div className="dealer-section">
                        {dealerPlayer ? (
                            <DealerArea
                                dealerHand={room.dealerHand}
                                dealerChips={dealerPlayer.chips}
                                gameState={room.gameState}
                                dealerName={dealerPlayer.username}
                            />
                        ) : (
                            <div className="dealer-empty" onClick={() => handleJoin(0)}>
                                <span>+ Ngồi làm Dealer</span>
                            </div>
                        )}
                    </div>

                    <div className="table-deco">
                        BLACKJACK PAYS 3 TO 2<br />
                        DEALER MUST DRAW TO 16 AND STAND ON ALL 17'S<br />
                        <span className="table-deco-name">{room.roomName}</span>
                    </div>

                    {/* PLAYERS AREA — bottom arc */}
                    <div className="players-area">
                        {tableSpots.map(({ seatIndex: si, player }, i) => {
                            const pos = SEATS_POS[i];

                            if (!player && !currentPlayer) {
                                return (
                                    <div key={si} className="seat-wrapper" style={{ left: pos.left, top: pos.top }}>
                                        <EmptySeat seatIndex={si} onJoin={handleJoin} />
                                    </div>
                                );
                            }
                            if (!player && currentPlayer && canBet && !isDealer) {
                                return (
                                    <div key={si} className="seat-wrapper" style={{ left: pos.left, top: pos.top }}>
                                        <EmptySeat seatIndex={si} onJoin={handleJoin} label="+ CHƠI THÊM TAY" />
                                    </div>
                                );
                            }
                            if (!player) {
                                return (
                                    <div key={si} className="seat-wrapper" style={{ left: pos.left, top: pos.top }}>
                                        <div className="seat-placeholder" />
                                    </div>
                                );
                            }
                            return (
                                <div key={`${player.userId}-${si}`} className="seat-wrapper" style={{ left: pos.left, top: pos.top }}>
                                    <PlayerSeat
                                        player={player}
                                        spotIndex={si}
                                        isCurrentUser={player.userId === userId}
                                        isActive={activePlayer?.userId === player.userId}
                                        gameState={room.gameState}
                                        onAction={handleAction}
                                        selectedChipValue={selectedChip}
                                        onBetClick={handleBetClick}
                                        canBet={canBet && !isDealer}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* Notice Bars */}
                    {!currentPlayer && (
                        <div className="notice-bar notice-spectator">👀 Click vào ghế để tham gia!</div>
                    )}
                    {room.gameState === 'FINISHED' && currentPlayer && (
                        <div className="notice-bar notice-end">✅ Ván kết thúc! {isDealer ? '' : 'Chờ ván mới...'}</div>
                    )}

                    {/* === CENTRAL ACTION HUD === */}
                    {activePlayer?.userId === userId && room.gameState === 'PLAYING' && (() => {
                        const activeHand = activePlayer.hands[activePlayer.activeHandIndex];
                        if (!activeHand) return null;

                        const canDbl = activeHand.cards.length === 2 && activePlayer.chips >= activeHand.bet;
                        const canSpl = activeHand.cards.length === 2 &&
                            (activeHand.cards[0].rank === activeHand.cards[1].rank || getCardValue(activeHand.cards[0].rank) === getCardValue(activeHand.cards[1].rank)) &&
                            activePlayer.hands.length < 3 &&
                            activePlayer.chips >= activeHand.bet;

                        return (
                            <div className="central-action-hud" style={{ zIndex: 1000 }}>
                                <div className="hud-title">⚡ LƯỢT CỦA BẠN (TAY {activePlayer.activeHandIndex + 1})</div>
                                <div className="hud-actions">
                                    <button
                                        className="act-hz act-double"
                                        onClick={() => handleAction('DOUBLE')}
                                        disabled={!canDbl}
                                        title={!canDbl ? "Chỉ được Double với 2 lá đầu tiên và đủ tiền" : ""}
                                    >
                                        DOUBLE
                                    </button>
                                    <button className="act-hz act-hit" onClick={() => handleAction('HIT')}>
                                        <span className="act-icon">+</span> HIT
                                    </button>
                                    <button className="act-hz act-stand" onClick={() => handleAction('STAND')}>
                                        <span className="act-icon">−</span> STAND
                                    </button>
                                    <button
                                        className="act-hz act-split"
                                        onClick={() => handleAction('SPLIT')}
                                        disabled={!canSpl}
                                        title={!canSpl ? "Hai lá cùng giá trị mới được Split (Tối đa 3 tay)" : ""}
                                    >
                                        SPLIT
                                    </button>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* ─── CHIP PICKER BAR ─── */}
                <ChipPicker
                    selectedChipValue={selectedChip}
                    onSelectChip={setSelectedChip}
                    playerChips={currentPlayer?.chips || 0}
                    gameState={room.gameState}
                    bettingTimeLeft={bettingTimeLeft}
                    isDealer={isDealer}
                    totalBet={totalBet}
                    onStartGame={handleStartGame}
                    onClearAllBets={handleClearAll}
                    onReset={handleReset}
                    onDeal={handleDeal}
                    currentPlayer={currentPlayer || null}
                />
            </div>

            {/* ─── RIGHT SIDEBAR ─── */}
            <div className="sidebar sidebar-right">
                <ChatPanel messages={messages} onSend={handleChat} currentUserId={userId} />
            </div>
        </div>
    );
}

// Dealer Admin Panel
function DealerAdminPanel({ players, dealerChips, onPump, onKick, onForceReset, gameState, onDeal, onReset, canBet }:
    { players: any[]; dealerChips: number; onPump: (uid: string, amt: number) => void; onKick: (uid: string) => void; onForceReset: () => void; gameState: string; onDeal: () => void; onReset: () => void; canBet: boolean; }) {
    const [showPump, setShowPump] = useState(false);
    const [showKick, setShowKick] = useState(false);
    const [targetPump, setTargetPump] = useState('');
    const [targetKick, setTargetKick] = useState('');
    const [amt, setAmt] = useState(1000);
    const ps = players.filter(p => p.role === 'PLAYER');

    return (
        <div className="pump-panel">
            <div className="history-header" style={{ marginBottom: '10px' }}>👑 DEALER ADMIN</div>

            {/* Quick Actions */}
            <div className="dealer-shortcut">
                {canBet && <button className="sc-btn" style={{ borderColor: '#2ecc71', color: '#2ecc71' }} onClick={onDeal}>🃏 Chia ngay</button>}
                {gameState === 'FINISHED' && <button className="sc-btn" style={{ borderColor: '#2ecc71', color: '#2ecc71' }} onClick={onReset}>🔄 Ván mới</button>}
                <button className="sc-btn" style={{ borderColor: '#e74c3c', color: '#e74c3c' }} onClick={onForceReset}>⛔ Hủy Ván</button>
            </div>

            {/* Pump Interface */}
            <button className="pump-toggle" style={{ marginTop: '10px' }} onClick={() => { setShowPump(!showPump); setShowKick(false); }}>💊 Bơm Chip {showPump ? '▲' : '▼'}</button>
            {showPump && (
                <div className="pump-form">
                    <select className="pump-sel" value={targetPump} onChange={e => setTargetPump(e.target.value)}>
                        <option value="">Chọn người...</option>
                        {ps.map(p => <option key={p.userId} value={p.userId}>{p.username} ({p.chips.toLocaleString()})</option>)}
                    </select>
                    <div className="pump-amts">
                        {[500, 1000, 2000, 5000].map(a => (
                            <button key={a} className={`pa-btn${amt === a ? ' pa-sel' : ''}`} onClick={() => setAmt(a)}>{a >= 1000 ? a / 1000 + 'K' : a}</button>
                        ))}
                    </div>
                    <button className="pump-go" disabled={!targetPump || dealerChips < amt}
                        onClick={() => { if (targetPump) { onPump(targetPump, amt); setShowPump(false); setTargetPump(''); } }}>
                        💊 Bơm {amt.toLocaleString()}
                    </button>
                </div>
            )}

            {/* Kick Interface */}
            <button className="pump-toggle" style={{ marginTop: '10px', backgroundColor: 'rgba(231,76,60,0.15)', borderColor: 'rgba(231,76,60,0.4)', color: '#ff6b6b' }} onClick={() => { setShowKick(!showKick); setShowPump(false); }}>👢 Đuổi Khách {showKick ? '▲' : '▼'}</button>
            {showKick && (
                <div className="pump-form">
                    <select className="pump-sel" value={targetKick} onChange={e => setTargetKick(e.target.value)}>
                        <option value="">Chọn người...</option>
                        {ps.map(p => <option key={p.userId} value={p.userId}>{p.username}</option>)}
                    </select>
                    <button className="pump-go" style={{ background: 'linear-gradient(135deg, #c0392b, #e74c3c)' }} disabled={!targetKick}
                        onClick={() => { if (targetKick && window.confirm('Bạn chắc chắn muốn đuổi người này khỏi phòng?')) { onKick(targetKick); setShowKick(false); setTargetKick(''); } }}>
                        👢 Đuổi Khỏi Bàn
                    </button>
                </div>
            )}
        </div>
    );
}
