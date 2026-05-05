"""
Transactional email sender — currently wired to Resend (https://resend.com).

API key + sender + frontend URL come from env vars (see app.config). If no
RESEND_API_KEY is configured, send_email() logs and returns False instead
of raising, so the rest of the app keeps working in dev / preview envs.
"""
from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

RESEND_ENDPOINT = "https://api.resend.com/emails"


def send_email(
    to: str,
    subject: str,
    html: str,
    text: Optional[str] = None,
) -> bool:
    """Send an email via Resend. Returns True on success, False on failure.

    We never raise — email failures should not abort the user-facing flow
    (e.g. someone clicks "forgot password"; we'd rather respond 200 and
    log the failure than expose internal errors).
    """
    if not settings.RESEND_API_KEY:
        logger.warning("Email skipped: RESEND_API_KEY not configured (to=%s, subject=%s)", to, subject)
        return False

    payload = {
        "from": settings.EMAIL_FROM,
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if text:
        payload["text"] = text

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                RESEND_ENDPOINT,
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
        if resp.status_code >= 400:
            logger.error("Resend rejected email: status=%s body=%s", resp.status_code, resp.text[:300])
            return False
        return True
    except httpx.HTTPError as exc:
        logger.exception("Resend HTTP error: %s", exc)
        return False


def send_password_reset_email(to: str, full_name: str | None, reset_link: str) -> bool:
    """Send the standard 'reset your password' email.

    Plain text and HTML variants share the same content — clients without
    HTML support still see something useful.
    """
    name = (full_name or "").strip() or to.split("@")[0]
    subject = "Réinitialiser votre mot de passe — Wealthly"
    text = (
        f"Bonjour {name},\n\n"
        f"Vous avez demandé à réinitialiser votre mot de passe Wealthly.\n\n"
        f"Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe (valable 60 minutes) :\n"
        f"{reset_link}\n\n"
        f"Si vous n'êtes pas à l'origine de cette demande, ignorez ce message — votre mot de passe actuel reste valide.\n\n"
        f"— Wealthly"
    )
    html = f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Réinitialiser votre mot de passe</title></head>
<body style="margin:0;padding:0;background:#0c0d10;font-family:Helvetica,Arial,sans-serif;color:#ebe8e3;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0c0d10;padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" border="0" style="background:#15171c;border:1px solid #232730;border-radius:12px;padding:36px;">
        <tr><td style="padding-bottom:20px;">
          <div style="display:inline-block;width:42px;height:42px;border:1px solid rgba(197,165,114,0.32);border-radius:6px;background:rgba(197,165,114,0.10);text-align:center;line-height:42px;color:#c5a572;font-weight:600;letter-spacing:0.04em;">W</div>
        </td></tr>
        <tr><td style="font-size:11px;text-transform:uppercase;letter-spacing:0.18em;color:#c5a572;padding-bottom:6px;">Wealthly · Patrimoine privé</td></tr>
        <tr><td style="font-size:20px;font-weight:600;color:#ebe8e3;padding-bottom:6px;">Réinitialiser votre mot de passe</td></tr>
        <tr><td style="font-size:14px;color:#b5b2ab;line-height:1.6;padding-bottom:24px;">
          Bonjour {name},<br><br>
          Vous avez demandé à réinitialiser votre mot de passe.
          Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
          <strong style="color:#ebe8e3;">Le lien est valable 60 minutes.</strong>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <a href="{reset_link}" style="display:inline-block;padding:11px 22px;background:#c5a572;color:#0c0d10;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;letter-spacing:0.01em;">Choisir un nouveau mot de passe</a>
        </td></tr>
        <tr><td style="font-size:12px;color:#8c8a85;line-height:1.6;padding-bottom:18px;">
          Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
          <span style="color:#c5a572;word-break:break-all;">{reset_link}</span>
        </td></tr>
        <tr><td style="border-top:1px solid #232730;padding-top:18px;font-size:11px;color:#5a5a55;line-height:1.6;">
          Si vous n'êtes pas à l'origine de cette demande, ignorez ce message. Votre mot de passe actuel reste valide.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    return send_email(to, subject, html, text)
