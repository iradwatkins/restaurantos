import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useQuery, useMutation } from 'convex/react';
import { toast } from 'sonner';

vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock('@restaurantos/backend', () => ({
  api: {
    kds: {
      queries: { getActiveTickets: 'getActiveTickets', getRecallQueue: 'getRecallQueue' },
      mutations: { bumpTicket: 'bumpTicket', bumpItem: 'bumpItem', recallTicket: 'recallTicket' },
    },
  },
}));

vi.mock('@restaurantos/backend/dataModel', () => ({}));

vi.mock('@/hooks/use-tenant', () => ({
  useTenant: () => ({ tenantId: 'tenant-1' }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import KDSPage from './kds-content';

const mockedUseQuery = vi.mocked(useQuery);
const mockedUseMutation = vi.mocked(useMutation);

const sampleTickets = [
  {
    _id: 'ticket-1',
    orderNumber: 42,
    sourceBadge: 'Dine-In',
    status: 'new' as const,
    receivedAt: Date.now() - 3 * 60000,
    source: 'dine_in',
    tableName: 'Table 5',
    customerName: null,
    estimatedPickupTime: null,
    items: [
      { name: 'Burger', quantity: 2, isBumped: false, modifiers: [] as string[], specialInstructions: null },
      { name: 'Fries', quantity: 1, isBumped: true, modifiers: ['Extra crispy'], specialInstructions: null },
    ],
  },
  {
    _id: 'ticket-2',
    orderNumber: 43,
    sourceBadge: 'Online',
    status: 'in_progress' as const,
    receivedAt: Date.now() - 8 * 60000,
    source: 'online',
    tableName: null,
    customerName: 'Jane Doe',
    estimatedPickupTime: null,
    items: [
      { name: 'Salad', quantity: 1, isBumped: false, modifiers: [] as string[], specialInstructions: 'No onions' },
    ],
  },
] as any;

const ticketWithPickupTime = [
  {
    _id: 'ticket-3',
    orderNumber: 44,
    sourceBadge: 'DoorDash',
    status: 'new' as const,
    receivedAt: Date.now() - 2 * 60000,
    source: 'doordash',
    tableName: null,
    customerName: 'John Smith',
    estimatedPickupTime: Date.now() + 30 * 60000,
    items: [
      { name: 'Pizza', quantity: 1, isBumped: false, modifiers: ['Extra cheese'], specialInstructions: 'Ring doorbell' },
    ],
  },
] as any;

const ticketWithTableAndCustomer = [
  {
    _id: 'ticket-4',
    orderNumber: 45,
    sourceBadge: 'Dine-In',
    status: 'new' as const,
    receivedAt: Date.now() - 1 * 60000,
    source: 'dine_in',
    tableName: 'Table 10',
    customerName: 'Bob Jones',
    estimatedPickupTime: null,
    items: [
      { name: 'Steak', quantity: 1, isBumped: false, modifiers: [], specialInstructions: null },
    ],
  },
] as any;

const sampleRecallQueue = [
  { _id: 'recall-1', ticketId: 'ticket-old', orderNumber: 40, source: 'dine_in' },
] as any;

describe('KDSPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseQuery.mockImplementation(((queryRef: any, args: any) => {
      if (args === 'skip') return undefined;
      if (queryRef === 'getActiveTickets') return sampleTickets;
      if (queryRef === 'getRecallQueue') return sampleRecallQueue;
      return undefined;
    }) as any);
    mockedUseMutation.mockReturnValue(vi.fn() as any);
  });

  it('renders the main KDS page when tenantId is available', () => {
    render(<KDSPage />);
    expect(screen.getByText('Kitchen Display')).toBeInTheDocument();
  });

  it('shows empty state when there are no tickets', () => {
    mockedUseQuery.mockImplementation(((queryRef: any) => {
      if (queryRef === 'getActiveTickets') return [];
      if (queryRef === 'getRecallQueue') return [];
      return undefined;
    }) as any);
    render(<KDSPage />);
    expect(screen.getByText('No active tickets')).toBeInTheDocument();
    expect(screen.getByText('Orders will appear here in real-time')).toBeInTheDocument();
  });

  it('renders the KDS header with Kitchen Display title', () => {
    render(<KDSPage />);
    expect(screen.getByText('Kitchen Display')).toBeInTheDocument();
  });

  it('shows the active ticket count in the header badge', () => {
    render(<KDSPage />);
    const badges = screen.getAllByText(/active/);
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('renders ticket order numbers', () => {
    render(<KDSPage />);
    expect(screen.getByText('#42')).toBeInTheDocument();
    expect(screen.getByText('#43')).toBeInTheDocument();
  });

  it('renders source badges on tickets', () => {
    render(<KDSPage />);
    expect(screen.getByText('Dine-In')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('renders ticket items with quantities', () => {
    render(<KDSPage />);
    expect(screen.getByText('Burger')).toBeInTheDocument();
    const quantityLabels = screen.getAllByText('2x');
    expect(quantityLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('shows special instructions', () => {
    render(<KDSPage />);
    expect(screen.getByText('!! No onions')).toBeInTheDocument();
  });

  it('shows modifiers for items', () => {
    render(<KDSPage />);
    expect(screen.getByText('Extra crispy')).toBeInTheDocument();
  });

  it('renders BUMP buttons for each ticket', () => {
    render(<KDSPage />);
    const bumpButtons = screen.getAllByText('BUMP');
    expect(bumpButtons).toHaveLength(2);
  });

  it('calls bumpTicket mutation when BUMP button is clicked', async () => {
    const bumpFn = vi.fn().mockResolvedValue({ orderNumber: 42 });
    mockedUseMutation.mockReturnValue(bumpFn as any);
    const user = userEvent.setup();
    render(<KDSPage />);
    const bumpButtons = screen.getAllByText('BUMP');
    await user.click(bumpButtons[0]!);
    expect(bumpFn).toHaveBeenCalledWith({ ticketId: 'ticket-1' });
  });

  it('shows recall button with count', () => {
    render(<KDSPage />);
    expect(screen.getByText(/Recall/)).toBeInTheDocument();
  });

  it('toggles recall queue visibility when Recall button is clicked', async () => {
    const user = userEvent.setup();
    render(<KDSPage />);
    expect(screen.queryByText('Recently Bumped (tap to recall)')).not.toBeInTheDocument();
    await user.click(screen.getByText(/Recall/));
    expect(screen.getByText('Recently Bumped (tap to recall)')).toBeInTheDocument();
  });

  it('displays table name on ticket when available', () => {
    render(<KDSPage />);
    expect(screen.getByText('Table 5')).toBeInTheDocument();
  });

  // --- New tests for uncovered branches ---

  it('shows toast success after bumping a ticket', async () => {
    const bumpFn = vi.fn().mockResolvedValue({ orderNumber: 42 });
    mockedUseMutation.mockReturnValue(bumpFn as any);
    const user = userEvent.setup();
    render(<KDSPage />);
    const bumpButtons = screen.getAllByText('BUMP');
    await user.click(bumpButtons[0]!);
    expect(toast.success).toHaveBeenCalledWith('Order #42 bumped');
  });

  it('shows toast error when bumping a ticket fails', async () => {
    const bumpFn = vi.fn().mockRejectedValue(new Error('Bump failed'));
    mockedUseMutation.mockReturnValue(bumpFn as any);
    const user = userEvent.setup();
    render(<KDSPage />);
    const bumpButtons = screen.getAllByText('BUMP');
    await user.click(bumpButtons[0]!);
    expect(toast.error).toHaveBeenCalledWith('Bump failed');
  });

  it('calls bumpItem when an item row is clicked', async () => {
    const bumpItemFn = vi.fn().mockResolvedValue(undefined);
    mockedUseMutation.mockReturnValue(bumpItemFn as any);
    const user = userEvent.setup();
    render(<KDSPage />);
    // Click on the Burger item row
    const burgerButton = screen.getByLabelText('Mark Burger as prepared');
    await user.click(burgerButton);
    expect(bumpItemFn).toHaveBeenCalledWith({ ticketId: 'ticket-1', itemIndex: 0 });
  });

  it('shows toast error when bumpItem fails', async () => {
    const bumpItemFn = vi.fn().mockRejectedValue(new Error('Item bump error'));
    mockedUseMutation.mockReturnValue(bumpItemFn as any);
    const user = userEvent.setup();
    render(<KDSPage />);
    const burgerButton = screen.getByLabelText('Mark Burger as prepared');
    await user.click(burgerButton);
    expect(toast.error).toHaveBeenCalledWith('Item bump error');
  });

  it('calls recallTicket when recall item is clicked', async () => {
    const recallFn = vi.fn().mockResolvedValue(undefined);
    mockedUseMutation.mockReturnValue(recallFn as any);
    const user = userEvent.setup();
    render(<KDSPage />);
    // Open recall queue
    await user.click(screen.getByText(/Recall/));
    // Click on the recall item
    await user.click(screen.getByText('#40'));
    expect(recallFn).toHaveBeenCalledWith({ ticketId: 'ticket-old' });
  });

  it('shows toast success after recalling a ticket', async () => {
    const recallFn = vi.fn().mockResolvedValue(undefined);
    mockedUseMutation.mockReturnValue(recallFn as any);
    const user = userEvent.setup();
    render(<KDSPage />);
    await user.click(screen.getByText(/Recall/));
    await user.click(screen.getByText('#40'));
    expect(toast.success).toHaveBeenCalledWith('Ticket recalled');
  });

  it('shows toast error when recall fails', async () => {
    const recallFn = vi.fn().mockRejectedValue(new Error('Recall error'));
    mockedUseMutation.mockReturnValue(recallFn as any);
    const user = userEvent.setup();
    render(<KDSPage />);
    await user.click(screen.getByText(/Recall/));
    await user.click(screen.getByText('#40'));
    expect(toast.error).toHaveBeenCalledWith('Recall error');
  });

  it('displays customer name when available', () => {
    render(<KDSPage />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('displays both table name and customer name with separator', () => {
    mockedUseQuery.mockImplementation(((queryRef: any, args: any) => {
      if (args === 'skip') return undefined;
      if (queryRef === 'getActiveTickets') return ticketWithTableAndCustomer;
      if (queryRef === 'getRecallQueue') return [];
      return undefined;
    }) as any);
    render(<KDSPage />);
    expect(screen.getByText('Table 10')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
  });

  it('displays estimated pickup time when available', () => {
    mockedUseQuery.mockImplementation(((queryRef: any, args: any) => {
      if (args === 'skip') return undefined;
      if (queryRef === 'getActiveTickets') return ticketWithPickupTime;
      if (queryRef === 'getRecallQueue') return [];
      return undefined;
    }) as any);
    render(<KDSPage />);
    expect(screen.getByText(/Pickup:/)).toBeInTheDocument();
  });

  it('applies yellow border to in_progress tickets', () => {
    render(<KDSPage />);
    // Ticket-2 has status 'in_progress' which should have border-yellow-400
    const tickets = document.querySelectorAll('.border-yellow-400');
    expect(tickets.length).toBeGreaterThanOrEqual(1);
  });

  it('applies default border to non-in_progress tickets', () => {
    render(<KDSPage />);
    const tickets = document.querySelectorAll('.border-border');
    expect(tickets.length).toBeGreaterThanOrEqual(1);
  });

  it('hides recall queue when recall button is toggled off', async () => {
    const user = userEvent.setup();
    render(<KDSPage />);
    await user.click(screen.getByText(/Recall/));
    expect(screen.getByText('Recently Bumped (tap to recall)')).toBeInTheDocument();
    await user.click(screen.getByText(/Recall/));
    expect(screen.queryByText('Recently Bumped (tap to recall)')).not.toBeInTheDocument();
  });

  it('hides recall queue section when recall queue is empty', async () => {
    mockedUseQuery.mockImplementation(((queryRef: any, args: any) => {
      if (args === 'skip') return undefined;
      if (queryRef === 'getActiveTickets') return sampleTickets;
      if (queryRef === 'getRecallQueue') return [];
      return undefined;
    }) as any);
    const user = userEvent.setup();
    render(<KDSPage />);
    await user.click(screen.getByText(/Recall/));
    // Even though showRecall is true, if recallQueue is empty, the section should not render
    expect(screen.queryByText('Recently Bumped (tap to recall)')).not.toBeInTheDocument();
  });

  it('shows DoorDash source badge with correct text', () => {
    mockedUseQuery.mockImplementation(((queryRef: any, args: any) => {
      if (args === 'skip') return undefined;
      if (queryRef === 'getActiveTickets') return ticketWithPickupTime;
      if (queryRef === 'getRecallQueue') return [];
      return undefined;
    }) as any);
    render(<KDSPage />);
    expect(screen.getByText('DoorDash')).toBeInTheDocument();
  });

  it('renders special instructions and modifiers together', () => {
    mockedUseQuery.mockImplementation(((queryRef: any, args: any) => {
      if (args === 'skip') return undefined;
      if (queryRef === 'getActiveTickets') return ticketWithPickupTime;
      if (queryRef === 'getRecallQueue') return [];
      return undefined;
    }) as any);
    render(<KDSPage />);
    expect(screen.getByText('Extra cheese')).toBeInTheDocument();
    expect(screen.getByText('!! Ring doorbell')).toBeInTheDocument();
  });

  it('shows check icon for bumped items', () => {
    render(<KDSPage />);
    // Fries item is bumped, should have line-through class
    const friesButton = screen.getByLabelText('Mark Fries as prepared');
    expect(friesButton.className).toContain('line-through');
  });
});
