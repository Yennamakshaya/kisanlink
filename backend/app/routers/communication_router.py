import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from app.database import get_db
from app.models import User, FarmerProfile, BuyerProfile, AdminMessage
from app.auth import get_current_user
from app.notifications import create_notification, notify_admins

router = APIRouter(prefix="/api/communication", tags=["Communication"])

class SendMessageRequest(BaseModel):
    message: str
    user_id: Optional[int] = None
    admin_id: Optional[int] = None
    conversation_id: Optional[str] = None

def get_user_display_info(u: User) -> Dict[str, str]:
    name = u.username
    location = "Telangana"
    if u.role == "farmer" and u.farmer_profile:
        name = u.farmer_profile.full_name or u.username
        loc_parts = [p for p in [u.farmer_profile.village, u.farmer_profile.district] if p]
        location = ", ".join(loc_parts) if loc_parts else "Telangana"
    elif u.role == "buyer" and u.buyer_profile:
        name = u.buyer_profile.company_name or u.username
        loc_parts = [p for p in [u.buyer_profile.city, u.buyer_profile.state] if p]
        location = ", ".join(loc_parts) if loc_parts else "Telangana"
    return {"name": name, "location": location}

def serialize_message(m: AdminMessage) -> Dict[str, Any]:
    sender_name = m.sender_name or "User"
    sender_role = m.sender_role or "user"
    if not m.sender_name and m.sender:
        sender_role = m.sender.role
        if m.sender.role == "admin":
            sender_name = "Administrator"
        else:
            sender_name = get_user_display_info(m.sender)["name"]
            
    iso_time = m.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if m.created_at else datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    return {
        "id": m.id,
        "adminId": m.admin_id,
        "admin_id": m.admin_id,
        "userId": m.user_id,
        "user_id": m.user_id,
        "conversationId": m.conversation_id,
        "conversation_id": m.conversation_id,
        "senderId": m.sender_id,
        "sender_id": m.sender_id,
        "senderName": sender_name,
        "senderRole": sender_role,
        "message": m.message,
        "createdAt": iso_time,
        "created_at": iso_time,
        "readStatus": bool(m.read_status),
        "read_status": bool(m.read_status),
    }

@router.post("/send")
def send_message(
    payload: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    msg_text = payload.message.strip()
    if not msg_text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    if current_user.role == "admin":
        if not payload.user_id:
            # Check if conversation_id was provided
            if payload.conversation_id and payload.conversation_id.startswith("conv_user_"):
                try:
                    target_user_id = int(payload.conversation_id.replace("conv_user_", ""))
                except Exception:
                    raise HTTPException(status_code=400, detail="Valid user_id or conversation_id required")
            else:
                raise HTTPException(status_code=400, detail="Recipient user_id is required")
        else:
            target_user_id = payload.user_id

        target_user = db.query(User).filter(User.id == target_user_id).first()
        if not target_user:
            raise HTTPException(status_code=404, detail="Recipient user not found")

        conv_id = payload.conversation_id or f"conv_user_{target_user_id}"

        new_msg = AdminMessage(
            admin_id=current_user.id,
            user_id=target_user_id,
            conversation_id=conv_id,
            sender_id=current_user.id,
            sender_role="admin",
            sender_name="Administrator",
            message=msg_text,
            read_status=False,
            created_at=datetime.datetime.utcnow()
        )
        db.add(new_msg)
        db.commit()
        db.refresh(new_msg)

        # Notify Farmer or Buyer
        create_notification(
            db=db,
            user_id=target_user_id,
            title="New Message from Administrator",
            message=f"Administrator: {msg_text[:120]}",
            notification_type="ADMIN_MESSAGE",
            related_id=conv_id,
            related_type="COMMUNICATION",
            prevent_duplicate_seconds=0
        )

        return serialize_message(new_msg)

    elif current_user.role in ["farmer", "buyer"]:
        user_id = current_user.id
        conv_id = payload.conversation_id or f"conv_user_{user_id}"

        # Resolve admin recipient
        admin_id = payload.admin_id
        if not admin_id:
            prev_msg = db.query(AdminMessage).filter(AdminMessage.conversation_id == conv_id).order_by(desc(AdminMessage.created_at)).first()
            if prev_msg and prev_msg.admin_id:
                admin_id = prev_msg.admin_id
            else:
                admin_user = db.query(User).filter(User.role == "admin").first()
                admin_id = admin_user.id if admin_user else 1

        user_info = get_user_display_info(current_user)

        new_msg = AdminMessage(
            admin_id=admin_id,
            user_id=user_id,
            conversation_id=conv_id,
            sender_id=current_user.id,
            sender_role=current_user.role,
            sender_name=user_info["name"],
            message=msg_text,
            read_status=False,
            created_at=datetime.datetime.utcnow()
        )
        db.add(new_msg)
        db.commit()
        db.refresh(new_msg)

        # Sender name & role for admin notification
        user_info = get_user_display_info(current_user)
        role_title = "Farmer" if current_user.role == "farmer" else "Buyer"

        notify_admins(
            db=db,
            title=f"New Message from {user_info['name']} ({role_title})",
            message=f"{msg_text[:120]}",
            notification_type="USER_MESSAGE",
            related_id=conv_id,
            related_type="COMMUNICATION"
        )

        return serialize_message(new_msg)
    else:
        raise HTTPException(status_code=403, detail="Unauthorized role for messaging")

@router.get("/messages")
def get_messages(
    conversation_id: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role in ["farmer", "buyer"]:
        # Scoped strictly to the authenticated farmer/buyer's own thread
        target_user_id = current_user.id
        conv_id = f"conv_user_{target_user_id}"

        # Mark unread messages sent by admin as read
        unread_msgs = db.query(AdminMessage).filter(
            AdminMessage.user_id == target_user_id,
            AdminMessage.sender_id != current_user.id,
            AdminMessage.read_status == False
        ).all()
        for um in unread_msgs:
            um.read_status = True
        if unread_msgs:
            db.commit()

        messages = db.query(AdminMessage).filter(
            AdminMessage.user_id == target_user_id
        ).order_by(asc(AdminMessage.created_at)).all()

        return [serialize_message(m) for m in messages]

    elif current_user.role == "admin":
        if not user_id and not conversation_id:
            return []

        query = db.query(AdminMessage)
        if user_id:
            query = query.filter(AdminMessage.user_id == user_id)
        elif conversation_id:
            query = query.filter(AdminMessage.conversation_id == conversation_id)

        messages = query.order_by(asc(AdminMessage.created_at)).all()

        # Mark user's messages as read by admin
        updated = False
        for m in messages:
            if m.sender_id != current_user.id and not m.read_status:
                m.read_status = True
                updated = True
        if updated:
            db.commit()

        return [serialize_message(m) for m in messages]
    else:
        raise HTTPException(status_code=403, detail="Unauthorized")

@router.get("/conversations")
def get_admin_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    # Group messages by user_id
    all_msgs = db.query(AdminMessage).order_by(desc(AdminMessage.created_at)).all()
    user_map: Dict[int, List[AdminMessage]] = {}
    for m in all_msgs:
        if m.user_id not in user_map:
            user_map[m.user_id] = []
        user_map[m.user_id].append(m)

    conversations = []
    for uid, msgs in user_map.items():
        u = db.query(User).filter(User.id == uid).first()
        if not u:
            continue
        u_info = get_user_display_info(u)
        latest = msgs[0]
        unread = sum(1 for m in msgs if m.sender_id == uid and not m.read_status)

        conversations.append({
            "conversationId": latest.conversation_id,
            "conversation_id": latest.conversation_id,
            "userId": uid,
            "user_id": uid,
            "userName": u_info["name"],
            "userRole": u.role,
            "userLocation": u_info["location"],
            "lastMessage": latest.message,
            "lastMessageTime": latest.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if latest.created_at else "",
            "unreadCount": unread
        })

    # Sort conversations by lastMessageTime descending
    conversations.sort(key=lambda c: c["lastMessageTime"], reverse=True)
    return conversations

@router.get("/user-info/{user_id}")
def get_chat_user_info(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    u_info = get_user_display_info(target_user)
    return {
        "userId": target_user.id,
        "userName": u_info["name"],
        "userRole": target_user.role,
        "userLocation": u_info["location"],
        "status": target_user.status,
        "conversationId": f"conv_user_{target_user.id}"
    }

@router.get("/resolve-chat/{chat_or_user_id}")
def resolve_chat_info(
    chat_or_user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    target_user = None
    conv_id = None

    # 1. Try as integer user_id
    if chat_or_user_id.isdigit():
        uid = int(chat_or_user_id)
        target_user = db.query(User).filter(User.id == uid).first()
        if target_user:
            conv_id = f"conv_user_{target_user.id}"

    # 2. Try as conv_user_<id>
    if not target_user and "conv_user_" in chat_or_user_id:
        try:
            raw_id = chat_or_user_id.split("conv_user_")[1]
            # Take only the digits following conv_user_
            import re
            m = re.match(r"(\d+)", raw_id)
            if m:
                uid = int(m.group(1))
                target_user = db.query(User).filter(User.id == uid).first()
                if target_user:
                    conv_id = f"conv_user_{target_user.id}"
        except Exception:
            pass

    # 3. Try lookup in AdminMessage by conversation_id
    if not target_user:
        msg = db.query(AdminMessage).filter(AdminMessage.conversation_id == chat_or_user_id).first()
        if msg:
            target_user = db.query(User).filter(User.id == msg.user_id).first()
            conv_id = msg.conversation_id

    # 4. If still not found, try searching by username or profile full_name
    if not target_user:
        target_user = db.query(User).filter(User.username == chat_or_user_id).first()
        if target_user:
            conv_id = f"conv_user_{target_user.id}"

    if not target_user:
        raise HTTPException(status_code=404, detail=f"Could not find user or conversation for '{chat_or_user_id}'")

    u_info = get_user_display_info(target_user)
    role_formatted = "Farmer" if target_user.role == "farmer" else "Buyer" if target_user.role == "buyer" else target_user.role.capitalize()
    return {
        "userId": target_user.id,
        "userName": u_info["name"],
        "userRole": role_formatted,
        "userLocation": u_info["location"],
        "status": target_user.status,
        "conversationId": conv_id or f"conv_user_{target_user.id}"
    }
