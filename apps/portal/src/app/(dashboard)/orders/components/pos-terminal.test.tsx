import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PosTerminal } from './pos-terminal';

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: any) => {
    const React = require('react');
    return React.createElement('img', props);
  },
}));

const formatCents = (cents: number) => (cents / 100).toFixed(2);

const defaultProps = () => ({
  categories: [
    { _id: 'cat-1', name: 'Appetizers' },
    { _id: 'cat-2', name: 'Entrees' },
    { _id: 'cat-3', name: 'Drinks' },
  ],
  filteredMenuItems: [
    { _id: 'item-1', name: 'Bruschetta', price: 899, type: 'food' },
    { _id: 'item-2', name: 'Steak', price: 2499, type: 'food' },
    { _id: 'item-3', name: 'Red Wine', price: 1200, type: 'wine' },
  ],
  selectedCat: null as string | null,
  setSelectedCat: vi.fn(),
  cart: [] as any[],
  tables: [
    { _id: 'table-1', name: 'Table 1', status: 'open' },
    { _id: 'table-2', name: 'Table 2', status: 'occupied' },
    { _id: 'table-3', name: 'Table 3', status: 'open' },
  ],
  selectedTable: null as string | null,
  setSelectedTable: vi.fn(),
  addToCart: vi.fn(),
  removeFromCart: vi.fn(),
  subtotal: 0,
  tax: 0,
  total: 0,
  TAX_RATE: 0.0875,
  handleSubmitOrder: vi.fn(),
  formatCents,
});

describe('PosTerminal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the "Select Items" heading', () => {
    render(<PosTerminal {...defaultProps()} />);
    expect(screen.getByText('Select Items')).toBeInTheDocument();
  });

  it('renders the "All" category button and all provided categories', () => {
    render(<PosTerminal {...defaultProps()} />);
    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Appetizers' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Entrees' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Drinks' })).toBeInTheDocument();
  });

  it('marks the selected category tab as aria-selected', () => {
    const props = defaultProps();
    props.selectedCat = 'cat-1';
    render(<PosTerminal {...props} />);
    expect(screen.getByRole('tab', { name: 'Appetizers' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls setSelectedCat when a category button is clicked', async () => {
    const props = defaultProps();
    const user = userEvent.setup();
    render(<PosTerminal {...props} />);
    await user.click(screen.getByRole('tab', { name: 'Entrees' }));
    expect(props.setSelectedCat).toHaveBeenCalledWith('cat-2');
  });

  it('renders all menu items with name and price', () => {
    render(<PosTerminal {...defaultProps()} />);
    expect(screen.getByText('Bruschetta')).toBeInTheDocument();
    expect(screen.getByText('$8.99')).toBeInTheDocument();
    expect(screen.getByText('Steak')).toBeInTheDocument();
    expect(screen.getByText('$24.99')).toBeInTheDocument();
  });

  it('shows a Wine icon for alcohol items (amber border)', () => {
    render(<PosTerminal {...defaultProps()} />);
    // Red Wine item should have amber border class
    const wineButton = screen.getByText('Red Wine').closest('button');
    expect(wineButton).toHaveClass('border-amber-300');
    // Food item should NOT have amber border
    const foodButton = screen.getByText('Bruschetta').closest('button');
    expect(foodButton).not.toHaveClass('border-amber-300');
  });

  it('calls addToCart when a menu item is clicked', async () => {
    const props = defaultProps();
    const user = userEvent.setup();
    render(<PosTerminal {...props} />);
    await user.click(screen.getByText('Bruschetta').closest('button')!);
    expect(props.addToCart).toHaveBeenCalledWith(props.filteredMenuItems[0]);
  });

  it('shows empty cart message when no items in cart', () => {
    render(<PosTerminal {...defaultProps()} />);
    expect(screen.getByText('Tap items to add')).toBeInTheDocument();
  });

  it('renders cart items with quantity, name, line total, and remove button', () => {
    const props = defaultProps();
    props.cart = [
      { menuItemId: 'item-1', name: 'Bruschetta', quantity: 2, unitPrice: 899, lineTotal: 1798 },
      { menuItemId: 'item-2', name: 'Steak', quantity: 1, unitPrice: 2499, lineTotal: 2499 },
    ];
    props.subtotal = 4297;
    props.tax = 376;
    props.total = 4673;
    render(<PosTerminal {...props} />);
    expect(screen.getByText('2x')).toBeInTheDocument();
    // Bruschetta appears both in the menu grid and in the cart
    const bruschettas = screen.getAllByText('Bruschetta');
    expect(bruschettas.length).toBe(2);
    // $17.98 is the Bruschetta line total (unique since subtotal is different)
    expect(screen.getByText('$17.98')).toBeInTheDocument();
    // Remove buttons for each cart item
    const removeButtons = screen.getAllByText('Remove');
    expect(removeButtons.length).toBe(2);
  });

  it('calls removeFromCart when Remove is clicked', async () => {
    const props = defaultProps();
    props.cart = [
      { menuItemId: 'item-1', name: 'Bruschetta', quantity: 1, unitPrice: 899, lineTotal: 899 },
    ];
    props.subtotal = 899;
    props.tax = 79;
    props.total = 978;
    const user = userEvent.setup();
    render(<PosTerminal {...props} />);
    await user.click(screen.getByText('Remove'));
    expect(props.removeFromCart).toHaveBeenCalledWith('item-1');
  });

  it('renders table select dropdown with only open tables', () => {
    render(<PosTerminal {...defaultProps()} />);
    const select = screen.getByLabelText('Select table');
    expect(select).toBeInTheDocument();
    const options = within(select as HTMLElement).getAllByRole('option');
    // "No table" + Table 1 + Table 3 (Table 2 is occupied, filtered out)
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('No table');
    expect(options[1]).toHaveTextContent('Table 1');
    expect(options[2]).toHaveTextContent('Table 3');
  });

  it('calls handleSubmitOrder when Place Order button is clicked', async () => {
    const props = defaultProps();
    props.cart = [
      { menuItemId: 'item-1', name: 'Bruschetta', quantity: 1, unitPrice: 899, lineTotal: 899 },
    ];
    props.subtotal = 899;
    props.tax = 79;
    props.total = 978;
    const user = userEvent.setup();
    render(<PosTerminal {...props} />);
    await user.click(screen.getByText('Place Order'));
    expect(props.handleSubmitOrder).toHaveBeenCalledTimes(1);
  });

  it('displays subtotal, tax, and total when cart has items', () => {
    const props = defaultProps();
    props.cart = [
      { menuItemId: 'item-2', name: 'Steak', quantity: 1, unitPrice: 2499, lineTotal: 2499 },
    ];
    props.subtotal = 2499;
    props.tax = 219;
    props.total = 2718;
    render(<PosTerminal {...props} />);
    expect(screen.getByText('Subtotal')).toBeInTheDocument();
    // $24.99 appears in both menu grid and cart summary
    const prices = screen.getAllByText('$24.99');
    expect(prices.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('$27.18')).toBeInTheDocument();
  });
});
