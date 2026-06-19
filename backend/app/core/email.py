import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import get_settings

def send_otp_email(to_email: str, otp: str) -> bool:
    settings = get_settings()
    if not settings.smtp_username or not settings.smtp_password:
        print(f"\n[WARNING] SMTP credentials not set. Skipping real email send to {to_email}. OTP is {otp}\n")
        return False
        
    from_email = settings.smtp_from_email or settings.smtp_username
    
    msg = MIMEMultipart()
    msg["From"] = from_email
    msg["To"] = to_email
    msg["Subject"] = f"{otp} is your PathPilot AI Verification Code"
    
    body = f"""Hello,

Thank you for registering with PathPilot AI!

Your One-Time Password (OTP) for account verification is:

{otp}

This code is valid for 10 minutes. If you did not request this code, please ignore this email.

Best regards,
The PathPilot AI Team
"""
    msg.attach(MIMEText(body, "plain"))
    
    try:
        if settings.smtp_port == 465:
            server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port)
        else:
            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port)
            server.starttls()
            
        server.login(settings.smtp_username, settings.smtp_password)
        server.sendmail(from_email, to_email, msg.as_string())
        server.quit()
        print(f"\n[INFO] OTP successfully emailed to {to_email}\n")
        return True
    except Exception as e:
        print(f"\n[ERROR] Failed to send email to {to_email}: {e}\n")
        return False


def send_reset_otp_email(to_email: str, otp: str) -> bool:
    settings = get_settings()
    if not settings.smtp_username or not settings.smtp_password:
        print(f"\n[WARNING] SMTP credentials not set. Skipping real email send to {to_email}. Reset OTP is {otp}\n")
        return False
        
    from_email = settings.smtp_from_email or settings.smtp_username
    
    msg = MIMEMultipart()
    msg["From"] = from_email
    msg["To"] = to_email
    msg["Subject"] = f"{otp} is your PathPilot AI Password Reset Code"
    
    body = f"""Hello,

You are receiving this email because a password reset request was made for your PathPilot AI account.

Your One-Time Password (OTP) to reset your password is:

{otp}

This code is valid for 15 minutes. If you did not request a password reset, please ignore this email.

Best regards,
The PathPilot AI Team
"""
    msg.attach(MIMEText(body, "plain"))
    
    try:
        if settings.smtp_port == 465:
            server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port)
        else:
            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port)
            server.starttls()
            
        server.login(settings.smtp_username, settings.smtp_password)
        server.sendmail(from_email, to_email, msg.as_string())
        server.quit()
        print(f"\n[INFO] Password reset OTP successfully emailed to {to_email}\n")
        return True
    except Exception as e:
        print(f"\n[ERROR] Failed to send email to {to_email}: {e}\n")
        return False

