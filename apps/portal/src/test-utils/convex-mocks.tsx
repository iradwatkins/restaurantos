import { vi } from 'vitest';
import React from 'react';

// Mock convex/react
export function mockUseQuery<T>(returnValue: T) {
  return vi.fn(() => returnValue);
}

export function mockUseMutation() {
  const mutate = vi.fn();
  return vi.fn(() => mutate);
}

export function mockUseAction() {
  const action = vi.fn();
  return vi.fn(() => action);
}

// Mock sonner toast
export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  loading: vi.fn(),
  dismiss: vi.fn(),
};

// Render helper — wraps component for testing
// Since we mock convex/react at the module level, no provider needed
export function renderWithProviders(ui: React.ReactElement) {
  // Lazy import to avoid circular deps
  const { render } = require('@testing-library/react');
  return render(ui);
}
