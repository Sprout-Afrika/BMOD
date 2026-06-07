import re
import urllib.parse
from datetime import datetime
from decimal import Decimal
from fastapi import HTTPException, status

_WA_NUMBER_RE = re.compile(r"^\d{10,15}$")


def build_whatsapp_url(message: str, whatsapp_number: str) -> str:
    if not _WA_NUMBER_RE.match(whatsapp_number):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="WhatsApp number misconfigured - contact administrator",
        )

    encoded = urllib.parse.quote(message)
    return f"https://wa.me/{whatsapp_number}?text={encoded}"


def build_order_message(
    ref_number: str,
    cart_snapshot: dict,
    customer_info: dict,
    payment_method: str,
    total_ngn: Decimal,
    expires_at: datetime,
) -> str:
    lines = []
    for index, item in enumerate(cart_snapshot["items"], start=1):
        size = f" - Size: {item['size']}" if item.get("size") else ""
        lines.append(
            f"{index}. {item['name']}{size} - Qty: {item['quantity']} - NGN {Decimal(item['line_total_ngn']):,.0f}"
        )

    return "\n".join(
        [
            f"NEW ORDER - {ref_number}",
            "",
            "Hi BMOD, I'd like to place this order:",
            "",
            *lines,
            "",
            "Deliver to:",
            customer_info["name"],
            customer_info["address"],
            f"Phone: {customer_info['phone']}",
            f"Email: {customer_info['email']}",
            "",
            f"Total: NGN {total_ngn:,.0f}",
            f"Payment: {payment_method}",
            "",
            "Please confirm availability and send payment details.",
            f"Order reserved until {expires_at.strftime('%Y-%m-%d %H:%M UTC')}.",
        ]
    )
