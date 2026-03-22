import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Online Pickup Order — Complete Flow', () => {
  test('customer places a pickup order end-to-end', async ({ page }) => {
    // Step 1: Navigate to online ordering page
    await page.goto('/order');

    // Wait for Convex backend to load menu data
    await expect(page.getByText('Loading menu...')).toBeHidden({ timeout: 30000 });

    // Step 2: Verify menu categories and items are displayed
    await expect(page.getByText(/\$\d+\.\d{2}/).first()).toBeVisible({ timeout: 15000 });

    // Step 3: Add first menu item to cart
    // Find the first "Add to Order" button (items without modifiers)
    const addButton = page.getByRole('button', { name: /Add to Order/i }).first();
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();

    // Step 4: Verify item appeared in the cart sidebar ("Your Order")
    await expect(page.getByText('Your Order')).toBeVisible();
    // Cart badge should show at least 1 item
    const cartBadge = page.locator('.ml-auto').filter({ hasText: /\d+/ }).first();
    await expect(cartBadge).toBeVisible({ timeout: 5000 });

    // Verify cart has the item with quantity controls
    await expect(page.getByRole('button', { name: /Decrease quantity/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Increase quantity/i }).first()).toBeVisible();

    // Step 5: Add a second item to make the order more realistic
    const secondAddButton = page.getByRole('button', { name: /Add to Order/i }).nth(1);
    if (await secondAddButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await secondAddButton.click();
    }

    // Step 6: Verify cart shows subtotal, tax, and total
    await expect(page.getByText('Subtotal')).toBeVisible();
    await expect(page.getByText(/Tax/)).toBeVisible();
    await expect(page.getByText('Total', { exact: true })).toBeVisible();

    // Step 7: Click Checkout button
    const checkoutButton = page.getByRole('button', { name: /Checkout/i });
    await expect(checkoutButton).toBeVisible();
    await checkoutButton.click();

    // Step 8: Fill in customer information
    // Name field
    const nameInput = page.locator('#name');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill('Test Customer');

    // Phone field
    const phoneInput = page.locator('#phone');
    await expect(phoneInput).toBeVisible();
    await phoneInput.fill('3125550100');

    // Email field (optional)
    const emailInput = page.locator('#email');
    await expect(emailInput).toBeVisible();
    await emailInput.fill('testcustomer@example.com');

    // Step 9: Verify Pickup Time selector is present with ASAP option
    const pickupSelect = page.locator('#scheduledTime');
    await expect(pickupSelect).toBeVisible();
    // ASAP should be the default (empty value)
    await expect(pickupSelect).toHaveValue('');

    // Step 10: Add order notes (optional)
    const notesInput = page.locator('#notes');
    await expect(notesInput).toBeVisible();
    await notesInput.fill('Extra napkins please');

    // Step 11: Submit the order
    // Without Stripe configured, button says "Place Order — $X.XX"
    const placeOrderButton = page.getByRole('button', { name: /Place Order/i });
    await expect(placeOrderButton).toBeVisible();
    await expect(placeOrderButton).toBeEnabled();
    await placeOrderButton.click();

    // Step 12: Verify order confirmation screen
    await expect(page.getByText('Order Confirmed!')).toBeVisible({ timeout: 30000 });

    // Order number should be displayed (e.g. #1, #2, etc.)
    await expect(page.getByText(/^#\d+$/)).toBeVisible();

    // Confirmation message about kitchen
    await expect(page.getByText('Your order has been sent to the kitchen.')).toBeVisible();

    // Step 13: Verify post-order actions
    await expect(page.getByRole('button', { name: /Track Order/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /New Order/i })).toBeVisible();
  });

  test('customer can increase item quantity in cart before checkout', async ({ page }) => {
    await page.goto('/order');
    await expect(page.getByText('Loading menu...')).toBeHidden({ timeout: 30000 });
    await expect(page.getByText(/\$\d+\.\d{2}/).first()).toBeVisible({ timeout: 15000 });

    // Add an item
    const addButton = page.getByRole('button', { name: /Add to Order/i }).first();
    await addButton.click();

    // Increase quantity
    const increaseButton = page.getByRole('button', { name: /Increase quantity/i }).first();
    await increaseButton.click();

    // Quantity should now show 2
    await expect(page.locator('.w-6.text-center').first()).toHaveText('2');
  });

  test('checkout validates required fields', async ({ page }) => {
    await page.goto('/order');
    await expect(page.getByText('Loading menu...')).toBeHidden({ timeout: 30000 });
    await expect(page.getByText(/\$\d+\.\d{2}/).first()).toBeVisible({ timeout: 15000 });

    // Add an item and go to checkout
    await page.getByRole('button', { name: /Add to Order/i }).first().click();
    await page.getByRole('button', { name: /Checkout/i }).click();

    // Try to place order without filling name
    await expect(page.locator('#name')).toBeVisible({ timeout: 5000 });
    const placeOrderButton = page.getByRole('button', { name: /Place Order/i });
    await placeOrderButton.click();

    // Should show validation error toast for missing name
    await expect(page.getByText(/Please enter your name/i)).toBeVisible({ timeout: 5000 });
  });
});
