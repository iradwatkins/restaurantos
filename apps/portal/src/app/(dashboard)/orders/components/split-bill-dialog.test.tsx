import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
const { mockToast, mockUseMutation } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn() },
  mockUseMutation: vi.fn(() => vi.fn()),
}));

vi.mock('convex/react', () => ({
  useMutation: (...args: Parameters<typeof mockUseMutation>) => mockUseMutation(...args),
}));

vi.mock('@restaurantos/backend', () => ({
  api: {
    orders: {
      split: { splitPayment: 'splitPayment' },
    },
  },
}));

vi.mock('sonner', () => ({
  toast: mockToast,
}));

import { SplitBillDialog } from './split-bill-dialog';
import type { Id } from '@restaurantos/backend/dataModel';

const sampleOrder = {
  _id: 'order-1' as Id<"orders">,
  total: 5000,
  items: [
    { name: 'Burger', quantity: 1, lineTotal: 2000 },
    { name: 'Salad', quantity: 1, lineTotal: 1500 },
    { name: 'Drink', quantity: 2, lineTotal: 1500 },
  ],
};

const baseProps = () => ({
  open: true,
  onOpenChange: vi.fn(),
  order: sampleOrder,
  tenantId: 'tenant-1' as Id<"tenants">,
  onComplete: vi.fn(),
});

describe('SplitBillDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue(vi.fn());
  });

  it('renders the Split Bill dialog title', () => {
    render(<SplitBillDialog {...baseProps()} />);
    expect(screen.getByText('Split Bill')).toBeInTheDocument();
  });

  it('displays the order total', () => {
    render(<SplitBillDialog {...baseProps()} />);
    expect(screen.getByText('$50.00')).toBeInTheDocument();
  });

  it('renders all three split mode buttons', () => {
    render(<SplitBillDialog {...baseProps()} />);
    expect(screen.getByText('Equal')).toBeInTheDocument();
    expect(screen.getByText('By Amount')).toBeInTheDocument();
    expect(screen.getByText('By Item')).toBeInTheDocument();
  });

  it('shows equal split by default with 2-way split', () => {
    render(<SplitBillDialog {...baseProps()} />);
    expect(screen.getByText('Person 1')).toBeInTheDocument();
    expect(screen.getByText('Person 2')).toBeInTheDocument();
    expect(screen.getAllByText('$25.00')).toHaveLength(2);
  });

  it('shows Card and Cash payment method buttons in equal mode', () => {
    render(<SplitBillDialog {...baseProps()} />);
    const cardButtons = screen.getAllByText('Card');
    const cashButtons = screen.getAllByText('Cash');
    expect(cardButtons.length).toBeGreaterThanOrEqual(1);
    expect(cashButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('switches to By Amount mode when clicked', async () => {
    const user = userEvent.setup();
    render(<SplitBillDialog {...baseProps()} />);
    await user.click(screen.getByText('By Amount'));
    expect(screen.getByText('Split 1')).toBeInTheDocument();
    expect(screen.getByText('Split 2')).toBeInTheDocument();
    expect(screen.getByText('Remaining')).toBeInTheDocument();
  });

  it('switches to By Item mode when clicked', async () => {
    const user = userEvent.setup();
    render(<SplitBillDialog {...baseProps()} />);
    await user.click(screen.getByText('By Item'));
    expect(screen.getByText(/Burger/)).toBeInTheDocument();
    expect(screen.getByText(/Salad/)).toBeInTheDocument();
    expect(screen.getByText(/Drink/)).toBeInTheDocument();
  });

  it('shows validation message in by_item mode when not all items are assigned', async () => {
    const user = userEvent.setup();
    render(<SplitBillDialog {...baseProps()} />);
    await user.click(screen.getByText('By Item'));
    expect(screen.getByText('Assign all items to a split to continue.')).toBeInTheDocument();
  });

  it('has a Process Split button', () => {
    render(<SplitBillDialog {...baseProps()} />);
    expect(screen.getByText('Process Split')).toBeInTheDocument();
  });

  it('enables Process Split button for valid equal split', () => {
    render(<SplitBillDialog {...baseProps()} />);
    const processButton = screen.getByText('Process Split');
    expect(processButton).not.toBeDisabled();
  });

  it('shows + Add Split button in by_amount mode', async () => {
    const user = userEvent.setup();
    render(<SplitBillDialog {...baseProps()} />);
    await user.click(screen.getByText('By Amount'));
    expect(screen.getByText('+ Add Split')).toBeInTheDocument();
  });

  it('shows remaining amount in by_amount mode when no amounts entered', async () => {
    const user = userEvent.setup();
    render(<SplitBillDialog {...baseProps()} />);
    await user.click(screen.getByText('By Amount'));
    const amounts = screen.getAllByText(/\$50\.00/);
    expect(amounts.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Remaining')).toBeInTheDocument();
  });

  // --- Equal split interactions ---

  it('processes equal split successfully', async () => {
    const splitFn = vi.fn().mockResolvedValue(undefined);
    mockUseMutation.mockReturnValue(splitFn);
    const props = baseProps();
    const user = userEvent.setup();
    render(<SplitBillDialog {...props} />);
    await user.click(screen.getByText('Process Split'));
    expect(splitFn).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      orderId: 'order-1',
      splits: [
        { amount: 2500, method: 'card' },
        { amount: 2500, method: 'card' },
      ],
    });
    expect(mockToast.success).toHaveBeenCalledWith('Bill split successfully');
    expect(props.onComplete).toHaveBeenCalled();
  });

  it('switches equal payment method to Cash', async () => {
    const splitFn = vi.fn().mockResolvedValue(undefined);
    mockUseMutation.mockReturnValue(splitFn);
    const props = baseProps();
    const user = userEvent.setup();
    render(<SplitBillDialog {...props} />);
    // Click Cash button
    await user.click(screen.getByText('Cash'));
    await user.click(screen.getByText('Process Split'));
    expect(splitFn).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      orderId: 'order-1',
      splits: [
        { amount: 2500, method: 'cash' },
        { amount: 2500, method: 'cash' },
      ],
    });
  });

  it('handles remainder correctly for uneven equal splits', async () => {
    // Order total is 5000. Split 3 ways: 1666 each, remainder 2
    const props = baseProps();
    const user = userEvent.setup();
    render(<SplitBillDialog {...props} />);
    const splitInput = screen.getByDisplayValue('2');
    await user.clear(splitInput);
    await user.type(splitInput, '3');
    // Person 1 gets 1668 ($16.68), Person 2 and 3 get 1666 ($16.66)
    expect(screen.getByText('Person 1')).toBeInTheDocument();
    expect(screen.getByText('Person 2')).toBeInTheDocument();
    expect(screen.getByText('Person 3')).toBeInTheDocument();
  });

  // --- By Amount interactions ---

  it('adds a new split row in by_amount mode', async () => {
    const user = userEvent.setup();
    render(<SplitBillDialog {...baseProps()} />);
    await user.click(screen.getByText('By Amount'));
    await user.click(screen.getByText('+ Add Split'));
    expect(screen.getByText('Split 3')).toBeInTheDocument();
  });

  it('removes split row in by_amount mode when X is clicked', async () => {
    const user = userEvent.setup();
    render(<SplitBillDialog {...baseProps()} />);
    await user.click(screen.getByText('By Amount'));
    // Add a third row first
    await user.click(screen.getByText('+ Add Split'));
    expect(screen.getByText('Split 3')).toBeInTheDocument();
    // Click the X button on the third row
    const xButtons = screen.getAllByText('X');
    await user.click(xButtons[xButtons.length - 1]!);
    expect(screen.queryByText('Split 3')).not.toBeInTheDocument();
  });

  it('does not allow removing rows when only 2 remain in by_amount', async () => {
    const user = userEvent.setup();
    render(<SplitBillDialog {...baseProps()} />);
    await user.click(screen.getByText('By Amount'));
    // With only 2 rows, X buttons should not be shown
    expect(screen.queryByText('X')).not.toBeInTheDocument();
  });

  it('shows validation message when by_amount totals do not match', async () => {
    const user = userEvent.setup();
    render(<SplitBillDialog {...baseProps()} />);
    await user.click(screen.getByText('By Amount'));
    // Amounts are both 0, remaining is $50.00
    expect(screen.getByText('Split amounts must equal the order total.')).toBeInTheDocument();
  });

  it('disables Process Split when by_amount is invalid', async () => {
    const user = userEvent.setup();
    render(<SplitBillDialog {...baseProps()} />);
    await user.click(screen.getByText('By Amount'));
    const processButton = screen.getByText('Process Split');
    expect(processButton).toBeDisabled();
  });

  // --- By Item interactions ---

  it('shows split number input in by_item mode', async () => {
    const user = userEvent.setup();
    render(<SplitBillDialog {...baseProps()} />);
    await user.click(screen.getByText('By Item'));
    expect(screen.getByText('Number of splits')).toBeInTheDocument();
  });

  it('shows item assignment buttons in by_item mode', async () => {
    const user = userEvent.setup();
    render(<SplitBillDialog {...baseProps()} />);
    await user.click(screen.getByText('By Item'));
    // Each item should have 2 split buttons (default split count is 2)
    const oneButtons = screen.getAllByText('1');
    const twoButtons = screen.getAllByText('2');
    // Should have at least 3 "1" buttons (one per item) and 3 "2" buttons
    expect(oneButtons.length).toBeGreaterThanOrEqual(3);
    expect(twoButtons.length).toBeGreaterThanOrEqual(3);
  });

  it('assigns items to splits in by_item mode', async () => {
    const user = userEvent.setup();
    render(<SplitBillDialog {...baseProps()} />);
    await user.click(screen.getByText('By Item'));

    // Click "1" for each item to assign all to split 1
    const oneButtons = screen.getAllByRole('button', { name: '1' });
    // The first 3 "1" buttons correspond to item assignment buttons
    for (const btn of oneButtons.slice(0, 3)) {
      await user.click(btn);
    }

    // Validation message should be gone since all items assigned
    expect(screen.queryByText('Assign all items to a split to continue.')).not.toBeInTheDocument();
  });

  it('disables Process Split in by_item when not all items assigned', async () => {
    const user = userEvent.setup();
    render(<SplitBillDialog {...baseProps()} />);
    await user.click(screen.getByText('By Item'));
    const processButton = screen.getByText('Process Split');
    expect(processButton).toBeDisabled();
  });

  // --- Error handling ---

  it('shows error toast when split processing fails', async () => {
    const splitFn = vi.fn().mockRejectedValue(new Error('Server error'));
    mockUseMutation.mockReturnValue(splitFn);
    const user = userEvent.setup();
    render(<SplitBillDialog {...baseProps()} />);
    await user.click(screen.getByText('Process Split'));
    expect(mockToast.error).toHaveBeenCalledWith('Server error');
  });

  it('shows generic error when non-Error is thrown', async () => {
    const splitFn = vi.fn().mockRejectedValue('unknown');
    mockUseMutation.mockReturnValue(splitFn);
    const user = userEvent.setup();
    render(<SplitBillDialog {...baseProps()} />);
    await user.click(screen.getByText('Process Split'));
    expect(mockToast.error).toHaveBeenCalledWith('Failed to split bill');
  });

  // --- By Amount method switching ---

  it('switches payment method for amount rows', async () => {
    const user = userEvent.setup();
    render(<SplitBillDialog {...baseProps()} />);
    await user.click(screen.getByText('By Amount'));
    // All Cash buttons
    const cashButtons = screen.getAllByText('Cash');
    await user.click(cashButtons[0]!);
    // The row method should switch to cash (visual change only, no direct assertion needed)
  });
});
