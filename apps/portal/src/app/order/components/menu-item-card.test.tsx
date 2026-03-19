import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { mockUseQuery, mockToast } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('convex/react', () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
}));

vi.mock('@restaurantos/backend', () => ({
  api: {
    public: {
      queries: { getModifiersForItem: 'getModifiersForItem' },
    },
  },
}));

vi.mock('@restaurantos/backend/dataModel', () => ({}));

vi.mock('next/image', () => ({
  default: (props: any) => {
    const React = require('react');
    return React.createElement('img', props);
  },
}));

vi.mock('sonner', () => ({
  toast: mockToast,
}));

vi.mock('@/lib/format', () => ({
  formatCents: (cents: number) => (cents / 100).toFixed(2),
}));

import { MenuItemCard } from './menu-item-card';
import type { Id } from '@restaurantos/backend/dataModel';

const basicItem = {
  _id: 'item-1' as Id<"menuItems">,
  name: 'Classic Burger',
  price: 1299,
  description: 'A juicy beef patty with lettuce and tomato',
  imageUrl: '/images/burger.jpg',
  isSpecial: false,
  dietaryTags: ['Gluten-Free'],
};

const specialItem = {
  _id: 'item-2' as Id<"menuItems">,
  name: 'Chef Special Pasta',
  price: 1899,
  description: 'Handmade pasta with truffle cream sauce',
  imageUrl: undefined as string | undefined,
  isSpecial: true,
  dietaryTags: ['Vegetarian', 'Contains Dairy'],
};

const minimalItem = {
  _id: 'item-3' as Id<"menuItems">,
  name: 'Plain Water',
  price: 0,
  description: undefined as string | undefined,
  imageUrl: undefined as string | undefined,
  isSpecial: false,
  dietaryTags: undefined as string[] | undefined,
};

const singleModifierGroup = [
  {
    _id: 'mod-1',
    name: 'Size',
    minSelections: 1,
    maxSelections: 1,
    options: [
      { _id: 'opt-1', name: 'Small', priceAdjustment: 0 },
      { _id: 'opt-2', name: 'Large', priceAdjustment: 200 },
    ],
  },
];

const multiModifierGroups = [
  {
    _id: 'mod-1',
    name: 'Size',
    minSelections: 1,
    maxSelections: 1,
    options: [
      { _id: 'opt-1', name: 'Small', priceAdjustment: 0 },
      { _id: 'opt-2', name: 'Large', priceAdjustment: 200 },
    ],
  },
  {
    _id: 'mod-2',
    name: 'Toppings',
    minSelections: 0,
    maxSelections: 3,
    options: [
      { _id: 'opt-3', name: 'Cheese', priceAdjustment: 100 },
      { _id: 'opt-4', name: 'Bacon', priceAdjustment: 150 },
      { _id: 'opt-5', name: 'Avocado', priceAdjustment: 200 },
      { _id: 'opt-6', name: 'Onion', priceAdjustment: 0 },
    ],
  },
];

const baseProps = () => ({
  item: basicItem,
  tenantId: 'tenant-1' as Id<"tenants">,
  onAdd: vi.fn(),
  onAddWithModifiers: vi.fn(),
});

describe('MenuItemCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue(null);
  });

  it('displays the item name', () => {
    render(<MenuItemCard {...baseProps()} />);
    expect(screen.getByText('Classic Burger')).toBeInTheDocument();
  });

  it('displays the item price formatted in dollars', () => {
    render(<MenuItemCard {...baseProps()} />);
    expect(screen.getByText(/12\.99/)).toBeInTheDocument();
  });

  it('displays the item description', () => {
    render(<MenuItemCard {...baseProps()} />);
    expect(screen.getByText('A juicy beef patty with lettuce and tomato')).toBeInTheDocument();
  });

  it('displays dietary tags as badges', () => {
    render(<MenuItemCard {...baseProps()} />);
    expect(screen.getByText('Gluten-Free')).toBeInTheDocument();
  });

  it('renders the item image when imageUrl is provided', () => {
    render(<MenuItemCard {...baseProps()} />);
    const img = screen.getByAltText('Classic Burger');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/images/burger.jpg');
  });

  it('does not render image when imageUrl is not provided', () => {
    const props = baseProps();
    props.item = specialItem as typeof basicItem;
    render(<MenuItemCard {...props} />);
    expect(screen.queryByAltText('Chef Special Pasta')).not.toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const props = baseProps();
    props.item = minimalItem as typeof basicItem;
    render(<MenuItemCard {...props} />);
    expect(screen.queryByText('A juicy')).not.toBeInTheDocument();
  });

  it('does not render dietary tags when not provided', () => {
    const props = baseProps();
    props.item = minimalItem as typeof basicItem;
    render(<MenuItemCard {...props} />);
    expect(screen.queryByText('Gluten-Free')).not.toBeInTheDocument();
  });

  it('shows Special badge for special items', () => {
    const props = baseProps();
    props.item = specialItem as typeof basicItem;
    render(<MenuItemCard {...props} />);
    expect(screen.getByText('Special')).toBeInTheDocument();
  });

  it('does not show Special badge for non-special items', () => {
    render(<MenuItemCard {...baseProps()} />);
    expect(screen.queryByText('Special')).not.toBeInTheDocument();
  });

  it('shows "Add to Order" button when item has no modifiers', () => {
    mockUseQuery.mockReturnValue(null);
    render(<MenuItemCard {...baseProps()} />);
    expect(screen.getByText('Add to Order')).toBeInTheDocument();
  });

  it('shows "Add to Order" button when modifiers array is empty', () => {
    mockUseQuery.mockReturnValue([]);
    render(<MenuItemCard {...baseProps()} />);
    expect(screen.getByText('Add to Order')).toBeInTheDocument();
  });

  it('calls onAdd directly when item has no modifiers', async () => {
    const props = baseProps();
    mockUseQuery.mockReturnValue(null);
    const user = userEvent.setup();
    render(<MenuItemCard {...props} />);
    await user.click(screen.getByText('Add to Order'));
    expect(props.onAdd).toHaveBeenCalledWith(basicItem);
  });

  it('shows "Customize & Add" button when item has modifiers', () => {
    mockUseQuery.mockReturnValue(singleModifierGroup);
    render(<MenuItemCard {...baseProps()} />);
    expect(screen.getByText('Customize & Add')).toBeInTheDocument();
  });

  it('opens modifier dialog when Customize & Add is clicked', async () => {
    mockUseQuery.mockReturnValue(singleModifierGroup);
    const user = userEvent.setup();
    render(<MenuItemCard {...baseProps()} />);
    await user.click(screen.getByText('Customize & Add'));
    expect(screen.getByText('Customize Classic Burger')).toBeInTheDocument();
    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.getByText('Small')).toBeInTheDocument();
    expect(screen.getByText('Large')).toBeInTheDocument();
  });

  it('displays multiple dietary tags', () => {
    const props = baseProps();
    props.item = specialItem as typeof basicItem;
    render(<MenuItemCard {...props} />);
    expect(screen.getByText('Vegetarian')).toBeInTheDocument();
    expect(screen.getByText('Contains Dairy')).toBeInTheDocument();
  });

  // --- Modifier dialog interactions ---

  it('shows "Required" label for modifier groups with minSelections > 0', async () => {
    mockUseQuery.mockReturnValue(singleModifierGroup);
    const user = userEvent.setup();
    render(<MenuItemCard {...baseProps()} />);
    await user.click(screen.getByText('Customize & Add'));
    expect(screen.getByText(/Required/)).toBeInTheDocument();
    expect(screen.getByText(/Choose one/)).toBeInTheDocument();
  });

  it('shows "Optional" label for modifier groups with minSelections === 0', async () => {
    mockUseQuery.mockReturnValue(multiModifierGroups);
    const user = userEvent.setup();
    render(<MenuItemCard {...baseProps()} />);
    await user.click(screen.getByText('Customize & Add'));
    expect(screen.getByText(/Optional/)).toBeInTheDocument();
    expect(screen.getByText(/Choose up to 3/)).toBeInTheDocument();
  });

  it('shows "Free" for options with 0 price adjustment', async () => {
    mockUseQuery.mockReturnValue(singleModifierGroup);
    const user = userEvent.setup();
    render(<MenuItemCard {...baseProps()} />);
    await user.click(screen.getByText('Customize & Add'));
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('shows price for options with positive price adjustment', async () => {
    mockUseQuery.mockReturnValue(singleModifierGroup);
    const user = userEvent.setup();
    render(<MenuItemCard {...baseProps()} />);
    await user.click(screen.getByText('Customize & Add'));
    expect(screen.getByText('+$2.00')).toBeInTheDocument();
  });

  it('selects a modifier option when clicked', async () => {
    mockUseQuery.mockReturnValue(singleModifierGroup);
    const user = userEvent.setup();
    render(<MenuItemCard {...baseProps()} />);
    await user.click(screen.getByText('Customize & Add'));

    const smallButton = screen.getByText('Small').closest('button')!;
    await user.click(smallButton);
    expect(smallButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('deselects a modifier option when clicked again', async () => {
    mockUseQuery.mockReturnValue(singleModifierGroup);
    const user = userEvent.setup();
    render(<MenuItemCard {...baseProps()} />);
    await user.click(screen.getByText('Customize & Add'));

    const smallButton = screen.getByText('Small').closest('button')!;
    await user.click(smallButton);
    expect(smallButton).toHaveAttribute('aria-pressed', 'true');
    await user.click(smallButton);
    expect(smallButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('replaces selection for maxSelections=1 groups', async () => {
    mockUseQuery.mockReturnValue(singleModifierGroup);
    const user = userEvent.setup();
    render(<MenuItemCard {...baseProps()} />);
    await user.click(screen.getByText('Customize & Add'));

    // Select Small
    await user.click(screen.getByText('Small').closest('button')!);
    expect(screen.getByText('Small').closest('button')!).toHaveAttribute('aria-pressed', 'true');

    // Select Large - should replace Small
    await user.click(screen.getByText('Large').closest('button')!);
    expect(screen.getByText('Large').closest('button')!).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Small').closest('button')!).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows error toast when required modifier group has no selection', async () => {
    mockUseQuery.mockReturnValue(singleModifierGroup);
    const user = userEvent.setup();
    render(<MenuItemCard {...baseProps()} />);
    await user.click(screen.getByText('Customize & Add'));

    // Click Add to Order without selecting anything
    const addButton = screen.getByText(/Add to Order/);
    await user.click(addButton);
    expect(mockToast.error).toHaveBeenCalledWith('Please select at least 1 option(s) for Size');
  });

  it('calls onAddWithModifiers when valid modifiers are confirmed', async () => {
    mockUseQuery.mockReturnValue(singleModifierGroup);
    const props = baseProps();
    const user = userEvent.setup();
    render(<MenuItemCard {...props} />);
    await user.click(screen.getByText('Customize & Add'));

    // Select Large
    await user.click(screen.getByText('Large').closest('button')!);
    // Click the Add to Order button
    const addButton = screen.getByText(/Add to Order/);
    await user.click(addButton);

    expect(props.onAddWithModifiers).toHaveBeenCalledWith(
      basicItem,
      [{ name: 'Large', priceAdjustment: 200 }]
    );
  });

  it('closes modifier dialog after successful confirmation', async () => {
    mockUseQuery.mockReturnValue(singleModifierGroup);
    const props = baseProps();
    const user = userEvent.setup();
    render(<MenuItemCard {...props} />);
    await user.click(screen.getByText('Customize & Add'));
    expect(screen.getByText('Customize Classic Burger')).toBeInTheDocument();

    await user.click(screen.getByText('Large').closest('button')!);
    const addButton = screen.getByText(/Add to Order/);
    await user.click(addButton);

    // Dialog should be closed
    expect(screen.queryByText('Customize Classic Burger')).not.toBeInTheDocument();
  });

  it('allows selecting multiple options in multi-select groups', async () => {
    mockUseQuery.mockReturnValue(multiModifierGroups);
    const props = baseProps();
    const user = userEvent.setup();
    render(<MenuItemCard {...props} />);
    await user.click(screen.getByText('Customize & Add'));

    // Select Size first (required)
    await user.click(screen.getByText('Small').closest('button')!);

    // Select multiple toppings
    await user.click(screen.getByText('Cheese').closest('button')!);
    await user.click(screen.getByText('Bacon').closest('button')!);

    expect(screen.getByText('Cheese').closest('button')!).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Bacon').closest('button')!).toHaveAttribute('aria-pressed', 'true');
  });

  it('prevents exceeding maxSelections in multi-select groups', async () => {
    mockUseQuery.mockReturnValue(multiModifierGroups);
    const user = userEvent.setup();
    render(<MenuItemCard {...baseProps()} />);
    await user.click(screen.getByText('Customize & Add'));

    // Select 3 toppings (max)
    await user.click(screen.getByText('Cheese').closest('button')!);
    await user.click(screen.getByText('Bacon').closest('button')!);
    await user.click(screen.getByText('Avocado').closest('button')!);

    // Try to select a 4th - should not work
    await user.click(screen.getByText('Onion').closest('button')!);
    expect(screen.getByText('Onion').closest('button')!).toHaveAttribute('aria-pressed', 'false');
  });

  it('updates the total price display when modifiers are selected', async () => {
    mockUseQuery.mockReturnValue(singleModifierGroup);
    const user = userEvent.setup();
    render(<MenuItemCard {...baseProps()} />);
    await user.click(screen.getByText('Customize & Add'));

    // Initially the button shows base price: $12.99
    expect(screen.getByText(/Add to Order — \$12\.99/)).toBeInTheDocument();

    // Select Large (+$2.00)
    await user.click(screen.getByText('Large').closest('button')!);
    expect(screen.getByText(/Add to Order — \$14\.99/)).toBeInTheDocument();
  });

  it('sends multiple modifiers when confirmed', async () => {
    mockUseQuery.mockReturnValue(multiModifierGroups);
    const props = baseProps();
    const user = userEvent.setup();
    render(<MenuItemCard {...props} />);
    await user.click(screen.getByText('Customize & Add'));

    // Select Size (required)
    await user.click(screen.getByText('Large').closest('button')!);
    // Select Toppings (optional)
    await user.click(screen.getByText('Cheese').closest('button')!);

    const addButton = screen.getByText(/Add to Order/);
    await user.click(addButton);

    expect(props.onAddWithModifiers).toHaveBeenCalledWith(
      basicItem,
      [
        { name: 'Large', priceAdjustment: 200 },
        { name: 'Cheese', priceAdjustment: 100 },
      ]
    );
  });
});
