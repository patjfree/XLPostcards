import resend
import requests
import base64
from typing import Optional


def send_email_notification(to_email: str, subject: str, message: str, pdf_url: Optional[str] = None):
    """Send email notification using Resend with PDF attachment"""
    try:
        if not resend.api_key:
            print(f"[EMAIL] WARNING: Resend API key not configured, skipping email to {to_email}")
            return
            
        print(f"[EMAIL] Sending email to {to_email}: {subject}")
        
        # Extract first name from email or use default
        first_name = to_email.split('@')[0].title() if '@' in to_email else "there"
        
        # Create HTML message with new content
        html_message = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <p>Hi {first_name},</p>
                
                <p>Your postcard has been successfully submitted for printing and mailing! ✉️✨</p>
                
                <p>We've attached a PDF copy of your postcard to this email so you can see exactly what your recipient will receive in their mailbox.</p>
                
                <p>📎 Attachment: postcard.pdf</p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <p><strong>What's next?</strong></p>
                <ul style="padding-left: 20px;">
                    <li>Your postcard is with the printer and will be printed and mailed shortly.</li>
                    <li>Want to share more smiles? It only takes a minute to send another postcard — whether it's for a birthday, thank-you, or "just because."</li>
                </ul>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <p>Thank you for choosing XLPostcards. We love helping you stay connected in the most personal way possible.</p>
                
                <p>Happy mailing,<br>
                The XLPostcards Team</p>
                
                <p style="font-size: 12px; color: #666; margin-top: 30px;">
                    For any issues or concerns contact us at <a href="mailto:info@xlpostcards.com">info@xlpostcards.com</a>
                </p>
            </div>
        </body>
        </html>
        """
        
        params = {
            "from": "XLPostcards <notifications@xlpostcards.com>",
            "to": [to_email],
            "subject": subject,
            "html": html_message,
        }
        
        # Download and attach PDF if URL provided
        if pdf_url:
            try:
                print(f"[EMAIL] Downloading PDF from: {pdf_url}")
                pdf_response = requests.get(pdf_url, timeout=30)
                pdf_response.raise_for_status()
                
                # Encode PDF as base64 for attachment
                pdf_base64 = base64.b64encode(pdf_response.content).decode('utf-8')
                
                # Add attachment to email params
                params["attachments"] = [{
                    "filename": "postcard.pdf",
                    "content": pdf_base64,
                    "content_type": "application/pdf"
                }]
                
                print(f"[EMAIL] PDF attachment prepared, size: {len(pdf_response.content)} bytes")
                
            except Exception as pdf_error:
                print(f"[EMAIL] Failed to download PDF for attachment: {pdf_error}")
                # Fall back to including the link in the message
                html_message = html_message.replace(
                    '<p>We\'ve attached a PDF copy of your postcard to this email so you can see exactly what your recipient will receive in their mailbox.</p>',
                    f'<p>You can view a copy of your postcard using this link: <a href="{pdf_url}" target="_blank">View your postcard</a></p>'
                )
                html_message = html_message.replace(
                    '<p>📎 Attachment: postcard.pdf</p>',
                    ''
                )
                params["html"] = html_message
        
        result = resend.Emails.send(params)
        print(f"[EMAIL] Email sent successfully to {to_email}, ID: {result.get('id', 'unknown')}")
        
    except Exception as e:
        print(f"[EMAIL] Failed to send email to {to_email}: {e}")