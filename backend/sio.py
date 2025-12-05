import socketio
import asyncio
from core.logging import get_logger

# logger = get_logger() 
# Using a lightweight print for critical server events to avoid logger overhead during high traffic
# If you prefer your custom logger, uncomment the line above and replace 'print' calls below.

logger = get_logger()

# Create a Socket.IO server with OPTIMIZED configuration
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    # CRITICAL FIX: Set these to False to stop the terminal flood and reduce CPU usage
    logger=False,
    engineio_logger=False,
    ping_timeout=60,
    ping_interval=25,
    namespaces=['/']
)

# This is no longer needed since we wrap in main.py
sio_app = socketio.ASGIApp(sio)

# In-memory participant tracking (for single-process server)
room_participants = {}

# PERFORMANCE FIX: Removed @sio.on('*') catch_all
# Listening to '*' adds overhead to every single packet. 
# Removing it allows the ICE candidates to flow without blocking.

@sio.event
async def connect(sid, environ):
    """Handle client connection"""
    # Keep connection logs as they are infrequent and useful
    logger.info(f"✅ SOCKET CONNECT: sid={sid}")

@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    logger.info(f"❌ SOCKET DISCONNECT: sid={sid}")
    
    # Remove user from all rooms they were in
    rooms_to_clean = []
    for room_id, participants in room_participants.items():
        if sid in participants:
            participants.remove(sid)
            rooms_to_clean.append(room_id)
            logger.info(f"   Removed {sid} from room {room_id}")
            
            # Notify other participants
            await sio.emit('user_left', {'sid': sid}, room=room_id)
    
    # Clean up empty rooms
    for room_id in rooms_to_clean:
        if len(room_participants[room_id]) == 0:
            del room_participants[room_id]
            logger.info(f"   Deleted empty room: {room_id}")

@sio.event
async def join_room(sid, data):
    """Handle user joining a room"""
    room_id = data.get('room_id')
    
    if not room_id:
        logger.error(f"❌ JOIN_ROOM: No room_id provided by {sid}")
        return
    
    logger.info(f"👤 JOIN_ROOM: sid={sid} room={room_id}")
    
    # Add user to Socket.IO room
    await sio.enter_room(sid, room_id)
    
    # Initialize room if it doesn't exist
    if room_id not in room_participants:
        room_participants[room_id] = set()
        logger.info(f"   Created new room: {room_id}")
    
    # Check if user already in room (reconnection case)
    if sid in room_participants[room_id]:
        logger.info(f"   User {sid} already in room {room_id} (reconnection)")
        # Still send participant list in case of reconnection
        participants_list = list(room_participants[room_id])
        other_participants = [p for p in participants_list if p != sid]
        
        if other_participants:
            logger.info(f"   Sending existing participants to {sid}: {other_participants}")
            await sio.emit('existing_participants', {
                'participants': other_participants
            }, room=sid)
        return
    
    # Get current participants before adding new one
    participants_list = list(room_participants[room_id])
    logger.info(f"   Current participants in {room_id}: {participants_list}")
    
    # Add new participant
    room_participants[room_id].add(sid)
    logger.info(f"   Added {sid} to room. Total participants: {len(room_participants[room_id])}")
    
    try:
        # Send list of existing participants to the newly joined user
        # AND Notify existing participants about the new user
        # We do this in parallel to reduce latency
        tasks = []
        
        if participants_list:
            logger.info(f"   Sending existing participants to {sid}: {participants_list}")
            tasks.append(sio.emit('existing_participants', {
                'participants': participants_list
            }, room=sid))
        else:
            logger.info(f"   No existing participants to send to {sid}")
        
        if participants_list:
            logger.info(f"   Notifying existing participants about new user {sid}")
            tasks.append(sio.emit('user_joined', {
                'sid': sid
            }, room=room_id, skip_sid=sid))
            
        if tasks:
            await asyncio.gather(*tasks)
        
    except Exception as e:
        logger.error(f"❌ Error in join_room for {sid}: {e}", exc_info=True)

@sio.event
async def offer(sid, data):
    """Relay WebRTC offer to target peer"""
    target_sid = data.get('target_sid')
    room_id = data.get('room_id')
    sdp = data.get('sdp')
    
    if not target_sid:
        logger.error(f"❌ OFFER: No target_sid from {sid}")
        return
    
    if not sdp:
        logger.error(f"❌ OFFER: No SDP from {sid}")
        return
    
    logger.info(f"📤 OFFER: {sid} → {target_sid} (room: {room_id})")
    
    try:
        await sio.emit('offer', {
            'sdp': sdp,
            'sender_sid': sid
        }, room=target_sid)
        logger.info(f"   ✅ Offer relayed successfully")
    except Exception as e:
        logger.error(f"❌ Error relaying offer: {e}", exc_info=True)

@sio.event
async def answer(sid, data):
    """Relay WebRTC answer to target peer"""
    target_sid = data.get('target_sid')
    sdp = data.get('sdp')
    
    if not target_sid:
        logger.error(f"❌ ANSWER: No target_sid from {sid}")
        return
    
    if not sdp:
        logger.error(f"❌ ANSWER: No SDP from {sid}")
        return
    
    logger.info(f"📤 ANSWER: {sid} → {target_sid}")
    
    try:
        await sio.emit('answer', {
            'sdp': sdp,
            'sender_sid': sid
        }, room=target_sid)
        logger.info(f"   ✅ Answer relayed successfully")
    except Exception as e:
        logger.error(f"❌ Error relaying answer: {e}", exc_info=True)

@sio.event
async def ice_candidate(sid, data):
    """Relay ICE candidate to target peer"""
    target_sid = data.get('target_sid')
    candidate = data.get('candidate')
    
    if not target_sid:
        # Don't log error here to avoid noise
        return
    
    if not candidate:
        return
    
    # PERFORMANCE FIX: Commented out log. 
    # ICE candidates generate 50+ logs per second, causing I/O blocking and video lag.
    # logger.debug(f"📤 ICE: {sid} → {target_sid}")
    
    try:
        await sio.emit('ice_candidate', {
            'candidate': candidate,
            'sender_sid': sid
        }, room=target_sid)
    except Exception as e:
        # Only log if there is an actual transmission error
        logger.error(f"❌ Error relaying ICE candidate: {e}", exc_info=True)

# Add a health check endpoint
@sio.event
async def ping(sid, data):
    """Handle ping for connection health check"""
    await sio.emit('pong', {'timestamp': data.get('timestamp')}, room=sid)

# Add room info endpoint for debugging
@sio.event
async def get_room_info(sid, data):
    """Get information about a room (for debugging)"""
    room_id = data.get('room_id')
    
    if room_id in room_participants:
        participants = list(room_participants[room_id])
        await sio.emit('room_info', {
            'room_id': room_id,
            'participants': participants,
            'count': len(participants)
        }, room=sid)
    else:
        await sio.emit('room_info', {
            'room_id': room_id,
            'participants': [],
            'count': 0,
            'exists': False
        }, room=sid)

# ------------------------------------------------------------------
# Whiteboard Events
# ------------------------------------------------------------------

@sio.event
async def wb_draw(sid, data):
    """Broadcast drawing events to room"""
    room_id = data.get('room_id')
    if not room_id:
        return
    
    # Broadcast to everyone ELSE in the room
    await sio.emit('wb_draw', data, room=room_id, skip_sid=sid)

@sio.event
async def wb_clear(sid, data):
    """Broadcast clear board event"""
    room_id = data.get('room_id')
    if not room_id:
        return
        
    await sio.emit('wb_clear', data, room=room_id, skip_sid=sid)

# ------------------------------------------------------------------
# Proctoring Events
# ------------------------------------------------------------------

@sio.event
async def proctor_event(sid, data):
    """Broadcast proctoring events (tab switch, etc.)"""
    room_id = data.get('room_id')
    if not room_id:
        return
    
    # Broadcast to everyone in the room
    await sio.emit('proctor_event', data, room=room_id)