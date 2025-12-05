from sqlalchemy.orm import Session
from models.notification import Notification
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    @staticmethod
    def create_notification(
        db: Session,
        user_id: int,
        title: str,
        message: str,
        type: str = "info",
        link_url: str = None
    ) -> Notification:
        """
        Creates a new notification for a user.
        """
        try:
            notification = Notification(
                user_id=user_id,
                title=title,
                message=message,
                type=type,
                link_url=link_url,
                created_at=datetime.utcnow(),
                is_read=False
            )
            db.add(notification)
            db.commit()
            db.refresh(notification)
            logger.info(f"Notification created for user {user_id}: {title}")
            return notification
        except Exception as e:
            logger.error(f"Failed to create notification: {e}")
            db.rollback()
            return None

notification_service = NotificationService()
