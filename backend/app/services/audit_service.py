"""Audit service for logging administrative and system security events."""

import logging
from typing import Optional
from sqlalchemy.orm import Session

from backend.app.models.audit_log import AuditLog

logger = logging.getLogger("eduguard.audit")


def log_audit_event(
    db: Session,
    actor_user_id: Optional[int],
    action: str,
    target: str,
    details: Optional[str] = None,
) -> AuditLog:
    """Create and persist an audit log entry.

    CRITICAL SECURITY RULE:
    Never log plaintext passwords, password hashes, tokens, or confidential student identifiers.

    Actions:
      - user_created
      - user_deactivated
      - user_reactivated
      - assignment_created
      - assignment_deleted
      - dataset_upload
    """
    entry = AuditLog(
        actor_user_id=actor_user_id,
        action=action,
        target=target,
        details=details,
    )
    db.add(entry)
    db.flush()
    logger.info("AUDIT: action=%s actor=%s target=%s details=%s", action, actor_user_id, target, details)
    return entry
