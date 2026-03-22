import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentDialog } from './payment-dialog';

const { mockToast } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: mockToast,
}));

const formatCents = (cents: number) => (cents / 100).toFixed(2);

const baseProps = () => ({
  showPayDialog: null as string | null,
  activeOrders: [
    {
      _id: 'order-1',
      orderNumber: 100,
      total: 5499,
      items: [{ name: 'Burger', quantity: 1, lineTotal: 5499 }],
    },
    {
      _id: 'order-2',
      orderNumber: 101,
      total: 1200,
      items: [{ name: 'Wine', quantity: 1, lineTotal: 1200, type: 'wine' }],
    },
  ],
  handleCashPayment: vi.fn(),
  setShowPayDialog: vi.fn(),
  ageVerifyItem: null as any,
  setAgeVerifyItem: vi.fn(),
  setAgeVerifiedThisSession: vi.fn(),
  addToCart: vi.fn(),
  formatCents,
});

describe('PaymentDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render payment content when showPayDialog is null', () => {
    const props = baseProps();
    render(<PaymentDialog {...props} />);
    expect(screen.queryByText('Process Payment')).not.toBeInTheDocument();
  });

  it('renders the payment dialog when showPayDialog has an order ID', () => {
    const props = baseProps();
    props.showPayDialog = 'order-1';
    render(<PaymentDialog {...props} />);
    expect(screen.getByText('Process Payment')).toBeInTheDocument();
  });

  it('displays the order total in the payment dialog', () => {
    const props = baseProps();
    props.showPayDialog = 'order-1';
    render(<PaymentDialog {...props} />);
    expect(screen.getByText('$54.99')).toBeInTheDocument();
  });

  it('displays the order number', () => {
    const props = baseProps();
    props.showPayDialog = 'order-1';
    render(<PaymentDialog {...props} />);
    expect(screen.getByText('Order #100')).toBeInTheDocument();
  });

  it('renders Cash and Card payment buttons', () => {
    const props = baseProps();
    props.showPayDialog = 'order-1';
    render(<PaymentDialog {...props} />);
    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.getByText('Card')).toBeInTheDocument();
  });

  it('calls handleCashPayment with correct args when Cash is clicked', async () => {
    const props = baseProps();
    props.showPayDialog = 'order-1';
    const user = userEvent.setup();
    render(<PaymentDialog {...props} />);
    // Step 1: Click Cash to open the CashTender
    await user.click(screen.getByText('Cash'));
    // Step 2: Click Exact to set amount to order total
    await user.click(screen.getByText('Exact'));
    // Step 3: Click Complete Payment to trigger the handler
    await user.click(screen.getByText('Complete Payment'));
    expect(props.handleCashPayment).toHaveBeenCalledWith('order-1', 5499, 0, 'cash');
  });

  it('shows toast info when Card is clicked (Stripe not configured)', async () => {
    const props = baseProps();
    props.showPayDialog = 'order-1';
    const user = userEvent.setup();
    render(<PaymentDialog {...props} />);
    await user.click(screen.getByText('Card'));
    expect(mockToast.info).toHaveBeenCalledWith(
      expect.stringContaining('Card payments require Stripe Terminal setup')
    );
  });

  it('renders the age verification dialog when ageVerifyItem is set', () => {
    const props = baseProps();
    props.ageVerifyItem = { _id: 'item-wine', name: 'Wine', price: 1200, type: 'wine' };
    render(<PaymentDialog {...props} />);
    expect(screen.getByText('Age Verification Required')).toBeInTheDocument();
    expect(screen.getByText(/21 years of age or older/)).toBeInTheDocument();
  });

  it('calls setAgeVerifiedThisSession and addToCart when age is verified', async () => {
    const props = baseProps();
    const alcoholItem = { _id: 'item-wine', name: 'Wine', price: 1200, type: 'wine' };
    props.ageVerifyItem = alcoholItem;
    const user = userEvent.setup();
    render(<PaymentDialog {...props} />);
    await user.click(screen.getByText('Yes, Verified 21+'));
    expect(props.setAgeVerifiedThisSession).toHaveBeenCalledWith(true);
    expect(props.addToCart).toHaveBeenCalledWith(alcoholItem);
  });

  it('closes age verification dialog on Cancel', async () => {
    const props = baseProps();
    props.ageVerifyItem = { _id: 'item-wine', name: 'Wine', price: 1200, type: 'wine' };
    const user = userEvent.setup();
    render(<PaymentDialog {...props} />);
    await user.click(screen.getByText('Cancel'));
    expect(props.setAgeVerifyItem).toHaveBeenCalledWith(null);
  });
});
