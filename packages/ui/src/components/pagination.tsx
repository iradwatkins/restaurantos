'use client';

import { Button } from './button';

interface PaginationProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  className?: string;
}

function Pagination({ hasMore, isLoading, onLoadMore, className }: PaginationProps) {
  if (!hasMore) return null;

  return (
    <div className={`flex justify-center py-4 ${className ?? ''}`}>
      <Button
        variant="outline"
        onClick={onLoadMore}
        disabled={isLoading}
      >
        {isLoading ? 'Loading...' : 'Load More'}
      </Button>
    </div>
  );
}

export { Pagination, type PaginationProps };
