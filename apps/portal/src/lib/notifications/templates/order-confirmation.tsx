interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface OrderConfirmationProps {
  restaurantName: string;
  orderNumber: string;
  items: OrderItem[];
  total: number;
  estimatedReadyAt?: string;
}

export function renderOrderConfirmationEmail({
  restaurantName,
  orderNumber,
  items,
  total,
  estimatedReadyAt,
}: OrderConfirmationProps): string {
  const itemRows = items
    .map(
      (item) => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
            ${item.name}
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: center;">
            ${item.quantity}
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">
            $${item.price.toFixed(2)}
          </td>
        </tr>`
    )
    .join("");

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
              <h2 style="margin: 0 0 8px; font-size: 18px; color: #111;">
                Order Confirmed
              </h2>
              <p style="margin: 0 0 24px; color: #555; font-size: 14px;">
                Order #${orderNumber}
              </p>

              <!-- Items -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <thead>
                  <tr>
                    <th style="padding: 8px 0; border-bottom: 2px solid #ddd; text-align: left; font-size: 12px; color: #888; text-transform: uppercase;">
                      Item
                    </th>
                    <th style="padding: 8px 0; border-bottom: 2px solid #ddd; text-align: center; font-size: 12px; color: #888; text-transform: uppercase;">
                      Qty
                    </th>
                    <th style="padding: 8px 0; border-bottom: 2px solid #ddd; text-align: right; font-size: 12px; color: #888; text-transform: uppercase;">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                </tbody>
              </table>

              <!-- Total -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 12px 0; font-size: 16px; font-weight: 700; color: #111;">
                    Total
                  </td>
                  <td style="padding: 12px 0; font-size: 16px; font-weight: 700; color: #111; text-align: right;">
                    $${total.toFixed(2)}
                  </td>
                </tr>
              </table>

              ${
                estimatedReadyAt
                  ? `
              <!-- Estimated Ready Time -->
              <div style="margin-top: 24px; padding: 16px; background-color: #f0fdf4; border-radius: 6px; text-align: center;">
                <p style="margin: 0 0 4px; font-size: 12px; color: #888; text-transform: uppercase;">
                  Estimated Ready At
                </p>
                <p style="margin: 0; font-size: 18px; font-weight: 600; color: #16a34a;">
                  ${estimatedReadyAt}
                </p>
              </div>`
                  : ""
              }
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 16px 24px; background-color: #fafafa; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #aaa;">
                Thank you for your order at ${restaurantName}.
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
