'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@restaurantos/backend';
import { Input, Badge } from '@restaurantos/ui';
import { Search, X, User } from 'lucide-react';
import { formatCents } from '@/lib/format';

interface SelectedCustomer {
  _id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  orderCount: number;
  totalSpent: number;
}

interface CustomerLookupProps {
  tenantId: string;
  onSelect: (customer: SelectedCustomer | null) => void;
  selectedCustomer: SelectedCustomer | null;
}

export function CustomerLookup({ tenantId, onSelect, selectedCustomer }: CustomerLookupProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useQuery(
    api.customers.queries.searchCustomers,
    debouncedSearch.trim().length >= 2
      ? { tenantId: tenantId as any, search: debouncedSearch }
      : 'skip'
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      if (value.trim().length >= 2) {
        setShowResults(true);
      }
    }, 250);
    setDebounceTimer(timer);
  }

  function handleSelect(customer: SelectedCustomer) {
    onSelect(customer);
    setSearch('');
    setDebouncedSearch('');
    setShowResults(false);
  }

  function handleClear() {
    onSelect(null);
    setSearch('');
    setDebouncedSearch('');
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (selectedCustomer) {
    return (
      <div className="flex items-center gap-2 p-2 border rounded-lg bg-accent/50">
        <User className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{selectedCustomer.name}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {selectedCustomer.phone ?? selectedCustomer.email ?? ''}
            {selectedCustomer.orderCount > 0 && (
              <span className="ml-1">
                ({selectedCustomer.orderCount} orders, ${formatCents(selectedCustomer.totalSpent)})
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleClear}
          className="text-muted-foreground hover:text-foreground p-0.5"
          aria-label="Remove customer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Customer (name or phone)"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => {
            if (debouncedSearch.trim().length >= 2) setShowResults(true);
          }}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {/* Results dropdown */}
      {showResults && results && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map((customer) => (
            <button
              key={customer._id}
              onClick={() => handleSelect(customer as SelectedCustomer)}
              className="w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b last:border-b-0"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{customer.name}</p>
                <Badge variant="outline" className="text-[10px]">
                  {customer.orderCount} orders
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {[customer.phone, customer.email].filter(Boolean).join(' | ')}
              </p>
            </button>
          ))}
        </div>
      )}

      {showResults && results && results.length === 0 && debouncedSearch.trim().length >= 2 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-lg shadow-lg">
          <p className="text-xs text-muted-foreground text-center py-3">No customers found</p>
        </div>
      )}
    </div>
  );
}
