interface OrderReadyProps {
  restaurantName: string;
  orderNumber: string;
}

export function renderOrderReadyEmail({
  restaurantName,
  orderNumber,
}: OrderReadyProps): string {
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
            <td style="padding: 48px 24px; text-align: center;">
              <div style="margin-bottom: 16px; font-size: 48px;">
                &#9989;
              </div>
              <h2 style="margin: 0 0 8px; font-size: 22px; color: #111;">
                Your Order is Ready!
              </h2>
              <p style="margin: 0 0 24px; color: #555; font-size: 14px;">
                Order #${orderNumber}
              </p>
              <div style="padding: 16px 24px; background-color: #f0fdf4; border-radius: 6px; display: inline-block;">
                <p style="margin: 0; font-size: 16px; font-weight: 600; color: #16a34a;">
                  Please pick up your order at the counter.
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 16px 24px; background-color: #fafafa; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #aaa;">
                Thank you for ordering at ${restaurantName}.
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
