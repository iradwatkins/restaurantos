import { logger } from '@/lib/logger';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  if (!RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY is not configured, skipping email send');
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RestaurantOS <noreply@restaurantos.app>",
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ err: error, to, subject }, 'Failed to send email');
    }
  } catch (err) {
    logger.error({ err, to, subject }, 'Error sending email');
  }
}
