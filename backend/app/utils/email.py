import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import get_settings

settings = get_settings()


async def send_email(to: str, subject: str, html_body: str) -> None:
    if not settings.smtp_password:
        print(f"[EMAIL SKIPPED] To: {to} | Subject: {subject}\n{html_body}")
        return

    message = MIMEMultipart("alternative")
    message["From"] = settings.email_from
    message["To"] = to
    message["Subject"] = subject
    message.attach(MIMEText(html_body, "html"))

    await aiosmtplib.send(
        message,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_username,
        password=settings.smtp_password,
        start_tls=True,
    )


async def send_verification_email(to: str, token: str, frontend_origin: str) -> None:
    url = f"{frontend_origin}/auth/verify-email?token={token}"
    await send_email(
        to=to,
        subject="Verify your BMOD account",
        html_body=f"""
        <h2>Welcome to BMOD</h2>
        <p>Click the link below to verify your email address:</p>
        <a href="{url}" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;">
          Verify Email
        </a>
        <p>This link expires in 24 hours.</p>
        """,
    )


async def send_otp_email(to: str, otp: str) -> None:
    await send_email(
        to=to,
        subject="Your BMOD password reset code",
        html_body=f"""
        <h2>Password Reset</h2>
        <p>Your one-time code is:</p>
        <h1 style="font-size:48px;letter-spacing:8px;">{otp}</h1>
        <p>This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
        """,
    )
