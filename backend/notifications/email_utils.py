import os
from django.core.mail import send_mail
from django.conf import settings


def send_email(to_email, subject, html_body):
    """Send email via Gmail SMTP."""
    if not to_email:
        return False
    try:
        send_mail( 
            subject=subject,
            message="",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to_email],
            html_message=html_body,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send to {to_email}: {e}")
        return False


# ── Template helpers ──────────────────────────────────────────────────────────

def _base(content):
    return f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body {{ font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }}
  .wrap {{ max-width: 580px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }}
  .header {{ background: #1b5e20; padding: 28px 32px; text-align: center; }}
  .header img {{ height: 40px; }}
  .header h1 {{ color: #fff; margin: 8px 0 0; font-size: 22px; letter-spacing: 0.3px; }}
  .header p {{ color: #a5d6a7; margin: 4px 0 0; font-size: 13px; }}
  .body {{ padding: 28px 32px; }}
  .body p {{ color: #444; font-size: 14px; line-height: 1.7; margin: 0 0 14px; }}
  .info-box {{ background: #f1f8e9; border-left: 4px solid #2e7d32; border-radius: 6px; padding: 16px 20px; margin: 18px 0; }}
  .info-row {{ display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e8f5e9; font-size: 13px; }}
  .info-row:last-child {{ border-bottom: none; }}
  .info-label {{ color: #666; font-weight: 600; }}
  .info-value {{ color: #1b5e20; font-weight: 700; }}
  .alert-box {{ background: #fff8e1; border-left: 4px solid #f9a825; border-radius: 6px; padding: 14px 20px; margin: 18px 0; font-size: 13px; color: #5d4037; }}
  .footer {{ background: #f9fbe7; padding: 18px 32px; text-align: center; font-size: 11px; color: #aaa; border-top: 1px solid #e8f0e9; }}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>LEAF MPC</h1>
    <p>Leaf Multi-Purpose Cooperative · Lucban, Quezon</p>
  </div>
  <div class="body">
    {content}
  </div>
  <div class="footer">
    This is an automated message from LEAF MPC System. Please do not reply to this email.<br>
    Lucban, Quezon, Philippines
  </div>
</div>
</body>
</html>
"""


def send_member_approved_email(email, fullname, member_id, username, plain_password, membership_date):
    """Send email when applicant becomes an official member."""
    content = f"""
    <p>Dear <strong>{fullname}</strong>,</p>
    <p>Congratulations! You are now an official member of <strong>LEAF Multi-Purpose Cooperative</strong>.
    Your membership has been approved and your account is ready to use.</p>

    <div class="info-box">
      <div class="info-row"><span class="info-label">Member ID</span><span class="info-value">{member_id}</span></div>
      <div class="info-row"><span class="info-label">Full Name</span><span class="info-value">{fullname}</span></div>
      <div class="info-row"><span class="info-label">Username</span><span class="info-value">{username}</span></div>
      <div class="info-row"><span class="info-label">Password</span><span class="info-value">{plain_password}</span></div>
      <div class="info-row"><span class="info-label">Membership Date</span><span class="info-value">{membership_date}</span></div>
    </div>

    <div class="alert-box">
      ⚠️ <strong>Important:</strong> Please keep your login credentials safe and confidential.
      Change your password after your first login.
    </div>

    <p>You may now log in to the LEAF MPC system to view your membership details,
    apply for loans, and track your savings.</p>
    <p>Welcome to the LEAF MPC family!</p>
    """
    return send_email(
        email,
        "Welcome to LEAF MPC — You are now an Official Member!",
        _base(content)
    )


def send_loan_approved_email(email, fullname, member_id, loan_id, loan_type, amount, monthly_due, term_months, next_due_date):
    """Send email when loan is approved."""
    content = f"""
    <p>Dear <strong>{fullname}</strong>,</p>
    <p>Great news! Your loan application has been <strong>approved</strong> by LEAF MPC.
    Please review your loan details below.</p>

    <div class="info-box">
      <div class="info-row"><span class="info-label">Member ID</span><span class="info-value">{member_id}</span></div>
      <div class="info-row"><span class="info-label">Loan ID</span><span class="info-value">{loan_id}</span></div>
      <div class="info-row"><span class="info-label">Loan Type</span><span class="info-value">{loan_type}</span></div>
      <div class="info-row"><span class="info-label">Loan Amount</span><span class="info-value">₱{float(amount):,.2f}</span></div>
      <div class="info-row"><span class="info-label">Monthly Due</span><span class="info-value">₱{float(monthly_due):,.2f}</span></div>
      <div class="info-row"><span class="info-label">Term</span><span class="info-value">{term_months} months</span></div>
      <div class="info-row"><span class="info-label">First Due Date</span><span class="info-value">{next_due_date}</span></div>
    </div>

    <div class="alert-box">
      <strong>Reminder:</strong> Please pay your monthly due of
      <strong>₱{float(monthly_due):,.2f}</strong> on or before <strong>{next_due_date}</strong>
      to avoid penalties.
    </div>

    <p>Please visit the LEAF MPC office to sign the necessary loan documents.
    You can track your loan status and payment history in the LEAF MPC system.</p>
    """
    return send_email(
        email,
        f"Loan Approved — {loan_id} · ₱{float(amount):,.2f}",
        _base(content)
    )


def send_due_date_reminder_email(email, fullname, member_id, loan_id, loan_type, monthly_due, due_date, balance):
    """Send email 3 days before payment due date."""
    content = f"""
    <p>Dear <strong>{fullname}</strong>,</p>
    <p>This is a friendly reminder that your loan payment is due in <strong>3 days</strong>.
    Please make sure to pay on time to avoid penalties.</p>

    <div class="info-box">
      <div class="info-row"><span class="info-label">Member ID</span><span class="info-value">{member_id}</span></div>
      <div class="info-row"><span class="info-label">Loan ID</span><span class="info-value">{loan_id}</span></div>
      <div class="info-row"><span class="info-label">Loan Type</span><span class="info-value">{loan_type}</span></div>
      <div class="info-row"><span class="info-label">Amount Due</span><span class="info-value" style="color:#c62828;font-size:16px;">₱{float(monthly_due):,.2f}</span></div>
      <div class="info-row"><span class="info-label">Due Date</span><span class="info-value" style="color:#e65100;">⚠ {due_date}</span></div>
      <div class="info-row"><span class="info-label">Remaining Balance</span><span class="info-value">₱{float(balance):,.2f}</span></div>
    </div>

    <div class="alert-box">
      💳 <strong>How to pay:</strong> Visit the LEAF MPC office to pay your monthly due.
      Bring your Member ID for reference.
    </div>

    <p>If you have already paid, please disregard this message.
    Thank you for being a responsible member of LEAF MPC!</p>
    """
    return send_email(
        email,
        f"⚠️ Payment Reminder — {loan_id} due on {due_date}",
        _base(content)
    )