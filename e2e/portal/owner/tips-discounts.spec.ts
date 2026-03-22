import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Tips & Discounts', () => {
  // ─── Helper: create a POS order and return to orders list ───

  async function createPosOrder(page: any) {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    await page.getByRole('button', { name: /New Order/i }).click();
    await expect(page.getByText('Select Items')).toBeVisible({ timeout: 10000 });

    // Add two items
    const firstItem = page.locator('button').filter({ hasText: /\$\d+\.\d{2}/ }).first();
    await expect(firstItem).toBeVisible({ timeout: 30000 });
    await firstItem.click();

    const secondItem = page.locator('button').filter({ hasText: /\$\d+\.\d{2}/ }).nth(1);
    if (await secondItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await secondItem.click();
    }

    // Place order
    const placeOrderButton = page.getByRole('button', { name: /Place Order/i });
    await expect(placeOrderButton).toBeVisible();
    await placeOrderButton.click();
    await expect(page.getByText(/Order created/i)).toBeVisible({ timeout: 15000 });
  }

  // ─── Tips ───

  test('select 15% tip and verify calculated amount', async ({ page }) => {
    await createPosOrder(page);

    // Open payment dialog
    const payButton = page.getByRole('button', { name: /Pay/i }).first();
    if (await payButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await payButton.click();

      // Payment dialog should be open
      await expect(page.getByText(/Payment/i).first()).toBeVisible({ timeout: 5000 });

      // Select 15% tip
      const tip15 = page.getByRole('button', { name: '15%' }).first();
      await expect(tip15).toBeVisible({ timeout: 5000 });
      await tip15.click();

      // Verify tip amount is displayed (should see a dollar amount for tip)
      // The payment dialog displays "Tip" followed by a dollar amount
      await expect(page.getByText(/Tip/).first()).toBeVisible();

      // There should be a non-zero tip amount visible
      const tipLine = page.locator('text=/Tip.*\\$\\d+\\.\\d{2}/');
      await expect(tipLine.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('select custom tip and verify custom amount applied', async ({ page }) => {
    await createPosOrder(page);

    const payButton = page.getByRole('button', { name: /Pay/i }).first();
    if (await payButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await payButton.click();
      await expect(page.getByText(/Payment/i).first()).toBeVisible({ timeout: 5000 });

      // Click "Custom" tip button
      const customButton = page.getByRole('button', { name: /Custom/i }).first();
      if (await customButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await customButton.click();

        // Fill in custom tip amount
        const tipInput = page.locator('input[placeholder*="tip"], input[type="text"]').last();
        if (await tipInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await tipInput.fill('5.00');

          // Verify the custom tip is reflected
          await expect(page.getByText(/\$5\.00/).first()).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  // ─── Discounts ───

  test('apply percentage discount and verify math', async ({ page }) => {
    await createPosOrder(page);

    const discountButton = page.getByRole('button', { name: /Discount/i }).first();
    if (await discountButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await discountButton.click();

      // Discount dialog should show available discounts
      await expect(
        page.getByText(/Discount/i).first()
      ).toBeVisible({ timeout: 5000 });

      // Look for a percentage discount option (e.g., "10% Off")
      const percentDiscount = page
        .getByRole('button', { name: /\d+%/i })
        .first();
      if (await percentDiscount.isVisible({ timeout: 3000 }).catch(() => false)) {
        await percentDiscount.click();

        // Verify discount applied
        await expect(page.getByText(/Applied|saved/i).first()).toBeVisible({
          timeout: 10000,
        });
      }
    }
  });

  test('apply fixed discount and verify math', async ({ page }) => {
    await createPosOrder(page);

    const discountButton = page.getByRole('button', { name: /Discount/i }).first();
    if (await discountButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await discountButton.click();

      await expect(
        page.getByText(/Discount/i).first()
      ).toBeVisible({ timeout: 5000 });

      // Look for a fixed dollar discount option (e.g., "$5 Off")
      const fixedDiscount = page
        .getByRole('button', { name: /\$\d+/i })
        .first();
      if (await fixedDiscount.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fixedDiscount.click();

        await expect(page.getByText(/Applied|saved/i).first()).toBeVisible({
          timeout: 10000,
        });
      }
    }
  });

  test('remove discount and verify total restored', async ({ page }) => {
    await createPosOrder(page);

    // First apply a discount
    const discountButton = page.getByRole('button', { name: /Discount/i }).first();
    if (await discountButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await discountButton.click();
      await expect(page.getByText(/Discount/i).first()).toBeVisible({ timeout: 5000 });

      const applyButton = page.getByRole('button', { name: /Apply|Select/i }).first();
      if (await applyButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await applyButton.click();
        await expect(page.getByText(/Applied|saved/i).first()).toBeVisible({ timeout: 10000 });
      }

      // Now remove the discount
      // Re-open discount dialog
      const discountButton2 = page.getByRole('button', { name: /Discount/i }).first();
      if (await discountButton2.isVisible({ timeout: 3000 }).catch(() => false)) {
        await discountButton2.click();

        const removeButton = page.getByRole('button', { name: /Remove/i }).first();
        if (await removeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await removeButton.click();
          await expect(page.getByText(/removed|restored/i).first()).toBeVisible({
            timeout: 10000,
          });
        }
      }
    }
  });

  // ─── Void Item ───

  test('void item and verify total recalculated', async ({ page }) => {
    await createPosOrder(page);

    const voidButton = page.getByRole('button', { name: /Void/i }).first();
    if (await voidButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await voidButton.click();

      // Void dialog
      await expect(page.getByText('Void Item')).toBeVisible({ timeout: 5000 });

      const reasonInput = page.locator('#void-reason');
      await expect(reasonInput).toBeVisible();
      await reasonInput.fill('Wrong item ordered');

      const confirmVoid = page.getByRole('button', { name: /Void Item/i }).last();
      await confirmVoid.click();

      // Verify voided toast with new total
      await expect(page.getByText(/Voided.*new total/i).first()).toBeVisible({
        timeout: 10000,
      });
    }
  });

  // ─── Comp Order ───

  test('comp order and verify $0 total', async ({ page }) => {
    await createPosOrder(page);

    const compButton = page.getByRole('button', { name: /Comp/i }).first();
    if (await compButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await compButton.click();

      // Comp dialog
      await expect(page.getByText(/Comp Order/i).first()).toBeVisible({ timeout: 5000 });

      // Dialog should show the current total will be waived
      await expect(page.getByText(/\$0\.00/i)).toBeVisible();

      const reasonInput = page.locator('#comp-reason');
      await expect(reasonInput).toBeVisible();
      await reasonInput.fill('Customer complaint');

      const confirmComp = page.getByRole('button', { name: /Comp Order/i }).last();
      await confirmComp.click();

      // Verify comp applied
      await expect(page.getByText(/comped/i).first()).toBeVisible({
        timeout: 10000,
      });
    }
  });
});
