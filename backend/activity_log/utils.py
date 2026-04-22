from .models import ActivityLog


def log_activity(action_type, description, user=None):
    """
    Helper function to log any activity.
    Call this from any view to record actions.

    Example:
        log_activity('member', 'Registered new member: Juan Dela Cruz', request.user)
        log_activity('payment', 'Payment of ₱1,500 recorded for LEAF-001', request.user)
    """
    try:
        ActivityLog.objects.create(
            action_type  = action_type,
            description  = description,
            performed_by = user,
        )
    except Exception as e:
        # Never crash the main request because of logging
        print(f'Activity log error: {e}')