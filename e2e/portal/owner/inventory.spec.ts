import { test, expect } from '../../fixtures/test-fixtures';

test.describe('Inventory Management', () => {
  test('inventory page loads with heading and tabs', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Verify heading
    await expect(page.getByText('Inventory Management').first()).toBeVisible({
      timeout: 10000,
    });

    // Verify tabs
    await expect(
      page.getByRole('button', { name: /Ingredients/i }).first()
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole('button', { name: /Waste Log/i }).first()
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole('button', { name: /Food Cost/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('ingredients tab shows table or empty state', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Ingredients tab should be active by default
    // Should see either ingredient rows or empty state
    const ingredientTable = page.locator('table').first();
    const emptyState = page.getByText('No ingredients yet');
    const searchEmpty = page.getByText('No ingredients match your search');

    const hasTable = await ingredientTable.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasTable || hasEmpty).toBeTruthy();
  });

  test('ingredient count is displayed', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Should show "X ingredients"
    await expect(page.getByText(/\d+ ingredients/i)).toBeVisible({ timeout: 10000 });
  });

  test('add ingredient button opens dialog', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    const addButton = page.getByRole('button', { name: /Add Ingredient/i });
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();

    // Dialog should appear
    await expect(page.getByText('Add Ingredient').last()).toBeVisible({ timeout: 5000 });

    // Form fields should be visible
    await expect(page.locator('#ing-name')).toBeVisible();
    await expect(page.locator('#ing-unit')).toBeVisible();
    await expect(page.locator('#ing-stock')).toBeVisible();
    await expect(page.locator('#ing-threshold')).toBeVisible();
    await expect(page.locator('#ing-cost')).toBeVisible();
  });

  test('can add a new ingredient', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Open add dialog
    await page.getByRole('button', { name: /Add Ingredient/i }).click();
    await expect(page.getByText('Add Ingredient').last()).toBeVisible({ timeout: 5000 });

    // Fill in ingredient data
    const testName = `E2E Ingredient ${Date.now()}`;
    await page.locator('#ing-name').fill(testName);
    await page.locator('#ing-stock').fill('100');
    await page.locator('#ing-threshold').fill('10');
    await page.locator('#ing-cost').fill('2.50');
    await page.locator('#ing-supplier').fill('E2E Supplier');

    // Select a category
    const categorySelect = page.locator('#ing-category');
    await categorySelect.selectOption('Proteins');

    // Submit
    const submitButton = page.getByRole('button', { name: /Add Ingredient/i }).last();
    await submitButton.click();

    // Verify success
    await expect(page.getByText(/Ingredient created/i)).toBeVisible({ timeout: 10000 });

    // Verify ingredient appears in the list
    await expect(page.getByText(testName)).toBeVisible({ timeout: 10000 });
  });

  test('search filters ingredients', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    const searchInput = page.getByPlaceholder('Search ingredients or suppliers...');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Type a search term
    await searchInput.fill('nonexistent-ingredient-xyz');

    // Should show "No ingredients match your search" or empty table
    const noMatch = page.getByText('No ingredients match your search');
    await expect(noMatch).toBeVisible({ timeout: 5000 });
  });

  test('receive stock dialog opens from action button', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // If there are ingredients, the receive stock button (arrow down icon) should be in the actions column
    const receiveButton = page.getByTitle('Receive stock').first();
    if (await receiveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await receiveButton.click();

      // Receive Stock dialog should appear
      await expect(page.getByText('Receive Stock').last()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('#recv-qty')).toBeVisible();
      await expect(page.locator('#recv-notes')).toBeVisible();

      // Fill quantity and submit
      await page.locator('#recv-qty').fill('25');
      await page.locator('#recv-notes').fill('E2E test delivery');

      const receiveSubmit = page.getByRole('button', { name: /Receive Stock/i }).last();
      await receiveSubmit.click();

      // Verify success
      await expect(page.getByText(/Stock received/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('record waste dialog opens from action button', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Find the record waste button (rotate icon)
    const wasteButton = page.getByTitle('Record waste').first();
    if (await wasteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await wasteButton.click();

      // Record Waste dialog should appear
      await expect(page.getByText('Record Waste').last()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('#waste-qty')).toBeVisible();

      // Fill quantity
      await page.locator('#waste-qty').fill('2');

      // Reason should default to "Spoilage"
      const reasonSelect = page.locator('select[name="reason"]');
      await expect(reasonSelect).toBeVisible();

      const recordButton = page.getByRole('button', { name: /Record Waste/i }).last();
      await recordButton.click();

      // Verify success
      await expect(page.getByText(/Waste recorded/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('waste log tab displays entries', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Click Waste Log tab
    await page.getByRole('button', { name: /Waste Log/i }).first().click();

    // Should show date filters
    await expect(page.getByText('Start Date')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('End Date')).toBeVisible({ timeout: 5000 });

    // Should show waste entries table or empty state
    const wasteTable = page.locator('table');
    const emptyState = page.getByText('No waste entries for this date range');

    const hasTable = await wasteTable.first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasTable || hasEmpty).toBeTruthy();
  });

  test('food cost tab displays analysis', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Click Food Cost tab
    await page.getByRole('button', { name: /Food Cost/i }).first().click();

    // Should show summary cards
    await expect(page.getByText('Average Food Cost').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Target Range').first()).toBeVisible({ timeout: 10000 });

    // Food cost table or empty state
    const foodCostTable = page.locator('table');
    const emptyState = page.getByText('No food cost data available');

    const hasTable = await foodCostTable.first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasTable || hasEmpty).toBeTruthy();
  });

  test('category filter works', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });

    // Find the category filter select
    const categoryTrigger = page.locator('[role="combobox"]').first();
    if (await categoryTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
      await categoryTrigger.click();

      // Select a category like "Proteins"
      const proteinsOption = page.getByRole('option', { name: 'Proteins' });
      if (await proteinsOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await proteinsOption.click();

        // Table should update (either show filtered items or empty)
        await page.waitForTimeout(500);
        await expect(page.locator('table').first()).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
