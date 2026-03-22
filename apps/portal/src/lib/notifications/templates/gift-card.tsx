interface GiftCardEmailProps {
  restaurantName: string;
  recipientName: string;
  purchaserName: string;
  message?: string;
  code: string;
  balanceFormatted: string;
  restaurantUrl?: string;
}

export function renderGiftCardEmail({
  restaurantName,
  recipientName,
  purchaserName,
  message,
  code,
  balanceFormatted,
  restaurantUrl,
}: GiftCardEmailProps): string {
  const messageBlock = message
    ? `
              <div style="margin: 20px 0; padding: 16px; background-color: #f9fafb; border-radius: 6px; border-left: 3px solid #16a34a;">
                <p style="margin: 0; font-size: 14px; color: #555; font-style: italic;">
                  "${message}"
                </p>
              </div>`
    : '';

  const urlBlock = restaurantUrl
    ? `
              <div style="margin-top: 24px; text-align: center;">
                <a href="${restaurantUrl}" style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
                  Visit ${restaurantName}
                </a>
              </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #16a34a; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">
                ${restaurantName}
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 24px;">
              <h2 style="margin: 0 0 8px; font-size: 22px; color: #111; text-align: center;">
                You've received a gift card!
              </h2>
              <p style="margin: 0 0 4px; color: #555; font-size: 14px; text-align: center;">
                Hi ${recipientName},
              </p>
              <p style="margin: 0 0 24px; color: #555; font-size: 14px; text-align: center;">
                <strong>${purchaserName}</strong> sent you a gift card to ${restaurantName}.
              </p>
              ${messageBlock}

              <!-- Gift Card Code -->
              <div style="margin: 24px 0; padding: 24px; border: 2px dashed #16a34a; border-radius: 12px; text-align: center; background-color: #f0fdf4;">
                <p style="margin: 0 0 8px; font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px;">
                  Gift Card Code
                </p>
                <p style="margin: 0 0 12px; font-size: 28px; font-weight: 700; font-family: 'Courier New', Courier, monospace; color: #111; letter-spacing: 3px;">
                  ${code}
                </p>
                <p style="margin: 0; font-size: 18px; font-weight: 600; color: #16a34a;">
                  ${balanceFormatted}
                </p>
              </div>

              <p style="margin: 24px 0 0; font-size: 14px; color: #555; text-align: center;">
                Redeem online or present this code in-store.
              </p>
              ${urlBlock}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 16px 24px; background-color: #fafafa; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #aaa;">
                This gift card was purchased at ${restaurantName}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
