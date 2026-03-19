'use client';

import { useQuery } from 'convex/react';
import { api } from '@restaurantos/backend';
import { ImageIcon } from 'lucide-react';
import type { Id } from '@restaurantos/backend/dataModel';

export function ItemImage({ storageId, name }: { storageId: Id<'_storage'>; name: string }) {
  const imageUrl = useQuery(api.menu.queries.getImageUrl, { storageId });

  if (!imageUrl) {
    return (
      <div className="h-32 bg-muted flex items-center justify-center rounded-t-lg">
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={name}
      className="h-32 w-full object-cover rounded-t-lg"
    />
  );
}
