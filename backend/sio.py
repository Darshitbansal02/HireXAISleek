import socketio
import asyncio
import uuid
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

# Rate limiting for proctor_event per socket (max events per time window)
proctor_event_limits = {}  # { sid: { count: int, window_start: timestamp } }
MAX_PROCTOR_EVENTS_PER_10S = 20  # allow up to 20 proctor events per 10 seconds per socket

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
    user_id = data.get('user_id')
    user_role = data.get('user_role')

    if not room_id:
        logger.error(f"❌ JOIN_ROOM: No room_id provided by {sid}")
        await sio.emit('join_denied', {'reason': 'missing_room_id'}, room=sid)
        return

    logger.info(f"👤 JOIN_ROOM Request: sid={sid} room={room_id} user_id={user_id} role={user_role}")

    # Basic auth validation: require user_id and user_role to be provided by the authenticated client
    if not user_id or not user_role:
        logger.warning(f"⚠️ JOIN_ROOM: Missing authentication info from {sid}")
        await sio.emit('join_denied', {'reason': 'missing_auth'}, room=sid)
        return

    # Verify against DB that this room exists and that the user is the scheduled candidate
    try:
        from core.database import SessionLocal
        from models.interview import InterviewSession

        db = SessionLocal()
        interview = db.query(InterviewSession).filter(InterviewSession.room_id == room_id).first()
    except Exception as e:
        logger.error(f"❌ JOIN_ROOM DB error for {sid}: {e}", exc_info=True)
        await sio.emit('join_denied', {'reason': 'db_error'}, room=sid)
        try:
            db.close()
        except Exception:
            pass
        return

    if not interview:
        logger.warning(f"⚠️ JOIN_ROOM: No interview found for room {room_id} (sid={sid})")
        await sio.emit('join_denied', {'reason': 'room_not_found'}, room=sid)
        db.close()
        return

    # Enforce: only the scheduled candidate may join
    try:
        # user_id may be string; cast safely
        uid = int(user_id)
    except Exception:
        logger.warning(f"⚠️ JOIN_ROOM: Invalid user_id provided by {sid}: {user_id}")
        await sio.emit('join_denied', {'reason': 'invalid_user_id'}, room=sid)
        db.close()
        return

    # Authorization: allow scheduled candidate OR the recruiter who scheduled OR admin role
    allowed = False
    try:
        if user_role == 'candidate' and uid == int(interview.candidate_id):
            allowed = True
        elif user_role == 'recruiter' and uid == int(interview.recruiter_id):
            allowed = True
        elif user_role == 'admin':
            allowed = True
    except Exception:
        allowed = False

    if not allowed:
        logger.warning(f"⛔ JOIN_ROOM DENIED: sid={sid} user_id={user_id} role={user_role} - not authorized for room {room_id}")
        await sio.emit('join_denied', {'reason': 'unauthorized'}, room=sid)
        db.close()
        return

    # Passed authorization - proceed to add to the room
    try:
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
            db.close()
            return

        # Get current participants before adding new one
        participants_list = list(room_participants[room_id])
        logger.info(f"   Current participants in {room_id}: {participants_list}")

        # Add new participant
        room_participants[room_id].add(sid)
        logger.info(f"   Added {sid} to room. Total participants: {len(room_participants[room_id])}")

        # Send list of existing participants to the newly joined user
        # AND Notify existing participants about the new user
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

        db.close()

    except Exception as e:
        logger.error(f"❌ Error in join_room for {sid}: {e}", exc_info=True)
        try:
            db.close()
        except Exception:
            pass

@sio.event
async def offer(sid, data):
    """Relay WebRTC offer to target peer - INITIATES VIDEO HANDSHAKE"""
    target_sid = data.get('target_sid')
    room_id = data.get('room_id')
    sdp = data.get('sdp')
    
    if not target_sid:
        logger.error(f"❌ OFFER: No target_sid from {sid} (room: {room_id})")
        # FALLBACK: Broadcast to room if target_sid missing
        if room_id and sdp:
            logger.warning(f"   Using fallback: Broadcasting offer to room {room_id}")
            await sio.emit('offer', {
                'sdp': sdp,
                'sender_sid': sid
            }, room=room_id, skip_sid=sid)
        return
    
    if not sdp:
        logger.error(f"❌ OFFER: No SDP from {sid} → {target_sid}")
        return
    
    logger.info(f"📤 OFFER: {sid} → {target_sid} (room: {room_id}) [INITIATING HANDSHAKE]")
    
    try:
        await sio.emit('offer', {
            'sdp': sdp,
            'sender_sid': sid
        }, room=target_sid)
        logger.info(f"   ✅ Offer relayed successfully")
    except Exception as e:
        logger.error(f"❌ Error relaying offer to {target_sid}: {e}", exc_info=True)
        # FALLBACK: Broadcast to room if direct fails
        if room_id:
            logger.warning(f"   Fallback: Broadcasting offer to room {room_id}")
            try:
                await sio.emit('offer', {
                    'sdp': sdp,
                    'sender_sid': sid
                }, room=room_id, skip_sid=sid)
            except Exception as e2:
                logger.error(f"   Fallback also failed: {e2}")

@sio.event
async def answer(sid, data):
    """Relay WebRTC answer to target peer - CRITICAL PATH FOR VIDEO START"""
    target_sid = data.get('target_sid')
    room_id = data.get('room_id')
    sdp = data.get('sdp')
    
    if not sdp:
        logger.error(f"❌ ANSWER: No SDP from {sid}")
        return
    
    # PRIMARY METHOD: If we have room_id, broadcast to entire room (more reliable)
    if room_id:
        logger.info(f"📤 ANSWER: {sid} → room {room_id} (Broadcasting to all)")
        try:
            await sio.emit('answer', {
                'sdp': sdp,
                'sender_sid': sid
            }, room=room_id, skip_sid=sid)
            logger.info(f"   ✅ Answer broadcasted to room")
            return
        except Exception as e:
            logger.error(f"❌ Error broadcasting answer: {e}")
    
    # FALLBACK: If no room_id, try direct target_sid
    if target_sid:
        logger.info(f"📤 ANSWER: {sid} → {target_sid} (direct)")
        try:
            await sio.emit('answer', {
                'sdp': sdp,
                'sender_sid': sid
            }, room=target_sid)
            logger.info(f"   ✅ Answer relayed to {target_sid}")
        except Exception as e:
            logger.error(f"❌ Error relaying answer: {e}")
    else:
        logger.warning(f"⚠️ ANSWER: No room_id or target_sid provided")

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

def save_proctor_log(room_id: str, event_type: str, payload: dict):
    """
    Save proctoring event to database asynchronously.
    IMPORTANT: Only saves METADATA, never saves images/snapshots.
    Handles both TestAssignments (assignment_id) and InterviewSessions (interview_room_id).
    """
    try:
        # SECURITY: Never save image data, only metadata
        # Strip any image fields from payload
        safe_payload = {k: v for k, v in payload.items() 
                       if k not in ['image', 'snapshot', 'screenshot', 'base64', 'blob', 'buffer']}
        
        from core.database import SessionLocal
        db = SessionLocal()
        try:
            from models.interview import InterviewSession
            from models.test_system import ProctorLog
            from sqlalchemy.exc import IntegrityError
            
            interview = db.query(InterviewSession).filter(InterviewSession.room_id == room_id).first()
            
            log_entry = ProctorLog(
                event_type=event_type,
                payload=safe_payload  # Use safe_payload, not payload
            )

            if interview:
                log_entry.interview_room_id = room_id
                db.add(log_entry)
                db.commit()
            else:
                # For assignments, just silently skip if room not found
                # Don't throw errors for orphaned sessions
                try:
                    uuid.UUID(room_id)
                    log_entry.assignment_id = room_id
                    db.add(log_entry)
                    db.commit()
                except (ValueError, IntegrityError):
                    # Room/assignment not found - this is ok for orphaned sessions
                    # Just don't save it
                    pass
        except Exception as e:
            db.rollback()
            # Don't spam logs with proctor save errors
            pass
        finally:
            db.close()
    except Exception as e:
        # Silently fail for proctor logs - don't crash the interview
        pass

@sio.event
async def proctor_event(sid, data):
    """
    Handle proctoring events (tab switch, face detection, etc.)
    SECURITY: Only broadcast sanitized metadata (no images/blobs).
    Validate event type and enforce rate limiting.
    """
    room_id = data.get('room_id')
    event_type = data.get('type')
    
    if not room_id or not event_type:
        logger.warning(f"⚠️ PROCTOR_EVENT: Missing room_id or event_type from {sid}")
        return
    
    # RATE LIMITING: Check if socket exceeded event limit
    now = asyncio.get_event_loop().time()
    if sid not in proctor_event_limits:
        proctor_event_limits[sid] = {'count': 0, 'window_start': now}
    
    limit_entry = proctor_event_limits[sid]
    if now - limit_entry['window_start'] > 10:
        # Window expired, reset
        limit_entry['count'] = 0
        limit_entry['window_start'] = now
    
    if limit_entry['count'] >= MAX_PROCTOR_EVENTS_PER_10S:
        logger.warning(f"⚠️ PROCTOR_EVENT RATE LIMIT: {sid} exceeded {MAX_PROCTOR_EVENTS_PER_10S} events in 10s")
        await sio.emit('proctor_event_rejected', {'reason': 'rate_limit_exceeded'}, room=sid)
        return
    
    limit_entry['count'] += 1
    
    # VALIDATION: Ensure event_type is known
    from core.proctor_constants import validate_event_type
    if not validate_event_type(event_type):
        logger.warning(f"⚠️ PROCTOR_EVENT: Invalid event_type '{event_type}' from {sid}")
        # Still log it for audit, but use a generic type
        event_type = 'suspicious_activity'
    
    # SECURITY: Build safe payload (strip all image-like fields)
    image_fields = ['image', 'snapshot', 'screenshot', 'base64', 'blob', 'buffer', 'jpeg', 'png']
    safe_payload = {}
    image_payload_attempted = False
    
    try:
        for k, v in (data or {}).items():
            if k in image_fields:
                image_payload_attempted = True
                logger.warning(f"🚨 AUDIT: Client {sid} attempted to send image field '{k}' in proctor_event (rejected)")
            else:
                safe_payload[k] = v
    except Exception as e:
        logger.warning(f"Error parsing proctor_event payload: {e}")
        safe_payload = {'details': 'unserializable-payload'}
    
    # Log the event (only safe_payload, never include images)
    logger.info(f"🚨 PROCTOR_EVENT: room={room_id} type={event_type} payload={safe_payload}")
    
    # Broadcast ONLY the safe_payload to room (recruiters receive metadata only)
    await sio.emit('proctor_event', safe_payload, room=room_id, skip_sid=sid)
    
    # Persist to DB asynchronously (pass data to save_proctor_log, which will strip images again for safety)
    await asyncio.to_thread(save_proctor_log, room_id, event_type, data)