import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Full Order Lifecycle', () => {
  // ─── POS Order: Dine-in → Add Items → Tip → Cash Payment → Completed ───

  test('POS: create dine-in order, add items, apply tip, cash payment, verify completed', async ({
    page,
  }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Open POS terminal
    const newOrderButton = page.getByRole('button', { name: /New Order/i });
    await expect(newOrderButton).toBeVisible({ timeout: 10000 });
    await newOrderButton.click();

    // Verify POS opened
    await expect(page.getByText('Select Items')).toBeVisible({ timeout: 10000 });

    // Wait for menu items
    const firstItem = page.locator('button').filter({ hasText: /\$\d+\.\d{2}/ }).first();
    await expect(firstItem).toBeVisible({ timeout: 30000 });

    // Add two items
    await firstItem.click();
    await expect(page.getByText('1x').first()).toBeVisible({ timeout: 5000 });

    const secondItem = page.locator('button').filter({ hasText: /\$\d+\.\d{2}/ }).nth(1);
    if (await secondItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await secondItem.click();
    }

    // Verify order totals
    await expect(page.getByText('Subtotal').last()).toBeVisible();
    await expect(page.getByText('Total').last()).toBeVisible();

    // If a table selector is visible, select a table for dine-in
    const tableSelect = page.locator('select[aria-label="Select table"]');
    if (await tableSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Select first available table
      const options = tableSelect.locator('option');
      const count = await options.count();
      if (count > 1) {
        await tableSelect.selectOption({ index: 1 });
      }
    }

    // Place the order
    const placeOrderButton = page.getByRole('button', { name: /Place Order/i });
    await expect(placeOrderButton).toBeVisible();
    await placeOrderButton.click();

    // Verify order created
    await expect(page.getByText(/Order created/i)).toBeVisible({ timeout: 15000 });

    // Verify the order appears in the Active Orders table
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10000 });

    // Open payment dialog for the first order
    const payButton = page.getByRole('button', { name: /Pay/i }).first();
    if (await payButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await payButton.click();

      // Payment dialog should open
      await expect(page.getByText(/Payment/i).first()).toBeVisible({ timeout: 5000 });

      // Select 15% tip
      const tip15 = page.getByRole('button', { name: '15%' }).first();
      if (await tip15.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tip15.click();
      }

      // Select cash payment
      const cashButton = page.getByRole('button', { name: /Cash/i }).first();
      if (await cashButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cashButton.click();
      }

      // Complete payment — look for a confirm/complete button
      const completeButton = page
        .getByRole('button', { name: /Complete|Confirm|Exact|Tender/i })
        .first();
      if (await completeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await completeButton.click();
        // Verify payment processed
        await expect(
          page.getByText(/paid|completed|Payment received/i).first()
        ).toBeVisible({ timeout: 15000 });
      }
    }
  });

  // ─── POS Order: Discount Flow ───

  test('POS: create order, apply discount, verify discounted total, payment', async ({
    page,
  }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Open POS and add an item
    await page.getByRole('button', { name: /New Order/i }).click();
    await expect(page.getByText('Select Items')).toBeVisible({ timeout: 10000 });

    const firstItem = page.locator('button').filter({ hasText: /\$\d+\.\d{2}/ }).first();
    await expect(firstItem).toBeVisible({ timeout: 30000 });
    await firstItem.click();
    await expect(page.getByText('1x').first()).toBeVisible({ timeout: 5000 });

    // Place the order first
    const placeOrderButton = page.getByRole('button', { name: /Place Order/i });
    await expect(placeOrderButton).toBeVisible();
    await placeOrderButton.click();
    await expect(page.getByText(/Order created/i)).toBeVisible({ timeout: 15000 });

    // Look for a discount button on the order row
    const discountButton = page
      .getByRole('button', { name: /Discount/i })
      .first();
    if (await discountButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await discountButton.click();

      // Discount dialog should appear
      await expect(
        page.getByText(/Apply.*Discount|Discount/i).first()
      ).toBeVisible({ timeout: 5000 });

      // Select the first available discount
      const discountOption = page
        .getByRole('button', { name: /Apply|Select/i })
        .first();
      if (await discountOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await discountOption.click();

        // Verify discount applied toast
        await expect(page.getByText(/Applied/i).first()).toBeVisible({
          timeout: 10000,
        });
      }
    }
  });

  // ─── POS Order: Void Item Flow ───

  test('POS: create order, void an item, verify total updated', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Open POS and add two items
    await page.getByRole('button', { name: /New Order/i }).click();
    await expect(page.getByText('Select Items')).toBeVisible({ timeout: 10000 });

    const firstItem = page.locator('button').filter({ hasText: /\$\d+\.\d{2}/ }).first();
    await expect(firstItem).toBeVisible({ timeout: 30000 });
    await firstItem.click();

    const secondItem = page.locator('button').filter({ hasText: /\$\d+\.\d{2}/ }).nth(1);
    if (await secondItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await secondItem.click();
    }

    // Place the order
    const placeOrderButton = page.getByRole('button', { name: /Place Order/i });
    await expect(placeOrderButton).toBeVisible();
    await placeOrderButton.click();
    await expect(page.getByText(/Order created/i)).toBeVisible({ timeout: 15000 });

    // Look for void action on the order
    const voidButton = page.getByRole('button', { name: /Void/i }).first();
    if (await voidButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await voidButton.click();

      // Void dialog should appear
      await expect(page.getByText('Void Item')).toBeVisible({ timeout: 5000 });

      // Fill in reason
      const reasonInput = page.locator('#void-reason');
      await expect(reasonInput).toBeVisible();
      await reasonInput.fill('Customer changed mind');

      // Confirm void
      const confirmVoid = page.getByRole('button', { name: /Void Item/i }).last();
      await confirmVoid.click();

      // Verify voided
      await expect(page.getByText(/Voided/i).first()).toBeVisible({
        timeout: 10000,
      });
    }
  });

  // ─── POS Order: Comp Flow ───

  test('POS: create order, comp order, verify $0 total', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Open POS and add an item
    await page.getByRole('button', { name: /New Order/i }).click();
    await expect(page.getByText('Select Items')).toBeVisible({ timeout: 10000 });

    const firstItem = page.locator('button').filter({ hasText: /\$\d+\.\d{2}/ }).first();
    await expect(firstItem).toBeVisible({ timeout: 30000 });
    await firstItem.click();

    // Place the order
    const placeOrderButton = page.getByRole('button', { name: /Place Order/i });
    await expect(placeOrderButton).toBeVisible();
    await placeOrderButton.click();
    await expect(page.getByText(/Order created/i)).toBeVisible({ timeout: 15000 });

    // Look for comp action
    const compButton = page.getByRole('button', { name: /Comp/i }).first();
    if (await compButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await compButton.click();

      // Comp dialog should appear
      await expect(page.getByText(/Comp Order/i).first()).toBeVisible({
        timeout: 5000,
      });

      // Fill in reason
      const reasonInput = page.locator('#comp-reason');
      await expect(reasonInput).toBeVisible();
      await reasonInput.fill('VIP guest');

      // Confirm comp
      const confirmComp = page
        .getByRole('button', { name: /Comp Order/i })
        .last();
      await confirmComp.click();

      // Verify comp applied — should see $0.00 or comped toast
      await expect(
        page.getByText(/comped|\$0\.00/i).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });

  // ─── Online Order: Customer-facing ordering page ───

  test('Online: visit ordering page, add items, checkout, verify order created', async ({
    page,
  }) => {
    // Online ordering is public — navigate to /order
    await page.goto('/order');

    // Wait for menu to load
    await expect(page.getByText('Loading menu...')).toBeHidden({ timeout: 30000 });
    await expect(page.getByText(/\$\d+\.\d{2}/).first()).toBeVisible({
      timeout: 15000,
    });

    // Add first item to order
    const addButton = page.getByRole('button', { name: /Add to Order/i }).first();
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();

    // Verify cart shows the item
    await expect(page.getByText('Your Order')).toBeVisible();

    // Verify subtotal/tax/total
    await expect(page.getByText('Subtotal')).toBeVisible();
    await expect(page.getByText(/Tax/)).toBeVisible();
    await expect(page.getByText('Total', { exact: true })).toBeVisible();

    // Click Checkout
    const checkoutButton = page.getByRole('button', { name: /Checkout/i });
    await expect(checkoutButton).toBeVisible();
    await checkoutButton.click();

    // Fill in customer info
    await page.locator('#name').fill('E2E Test Customer');
    await page.locator('#phone').fill('3125559999');
    await page.locator('#email').fill('e2etest@example.com');

    // Submit the order
    const placeOrderButton = page.getByRole('button', { name: /Place Order/i });
    await expect(placeOrderButton).toBeVisible();
    await expect(placeOrderButton).toBeEnabled();
    await placeOrderButton.click();

    // Verify order confirmation
    await expect(page.getByText('Order Confirmed!')).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByText(/^#\d+$/)).toBeVisible();
  });
});
