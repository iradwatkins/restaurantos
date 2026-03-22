'use client';

import { useQuery } from 'convex/react';
import { api } from '@restaurantos/backend';
import { useTenant } from '@/hooks/use-tenant';
import { Badge } from '@restaurantos/ui';
import { Wine, UtensilsCrossed } from 'lucide-react';

const ALCOHOL_TYPES = ['beer', 'wine', 'spirits'];

interface MenuShowcaseProps {
  initialMenu: any[] | null;
}

export default function MenuShowcasePage({ initialMenu }: MenuShowcaseProps) {
  const { tenantId } = useTenant();

  const clientMenu = useQuery(
    api.public.queries.getFullMenu,
    !initialMenu && tenantId ? { tenantId } : 'skip'
  );

  const menu = initialMenu ?? clientMenu;

  if (!menu) {
    return <div className="text-center py-20 text-muted-foreground">Loading menu...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2">Our Menu</h1>
        <p className="text-muted-foreground">
          Fresh ingredients, expertly prepared
        </p>
      </div>

      <div className="space-y-12">
        {menu.map((category: any) => (
          <section key={category._id}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold">{category.name}</h2>
              {category.description && (
                <p className="text-muted-foreground mt-1">{category.description}</p>
              )}
              {category.menuType && category.menuType !== 'all' && (
                <Badge variant="secondary" className="mt-2 capitalize">
                  {category.menuType} menu
                </Badge>
              )}
            </div>

            <div className="space-y-3">
              {category.items.map((item: any) => (
                <MenuShowcaseItem key={item._id} item={item} />
              ))}
            </div>
          </section>
        ))}

        {menu.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            Menu is being prepared. Check back soon!
          </div>
        )}
      </div>
    </div>
  );
}

function MenuShowcaseItem({ item }: { item: any }) {
  const displayImage = item.imageUrl || null;
  const itemType = item.type ?? 'food';
  const isAlcohol = ALCOHOL_TYPES.includes(itemType);
  const isSoldOut = item.is86d === true;

  return (
    <div className={`flex gap-4 p-4 rounded-lg border transition-colors ${isSoldOut ? 'opacity-60' : 'hover:bg-accent/30'}`}>
      {displayImage ? (
        <img
          src={displayImage}
          alt={item.name}
          className="h-20 w-20 rounded-md object-cover flex-shrink-0"
        />
      ) : (
        <div className="h-20 w-20 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
          <UtensilsCrossed className="h-8 w-8 text-muted-foreground/40" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{item.name}</h3>
              {isSoldOut && (
                <Badge variant="destructive" className="text-[10px]">Sold Out</Badge>
              )}
              {isAlcohol && (
                <Wine className="h-3.5 w-3.5 text-amber-500" />
              )}
              {item.isSpecial && !isSoldOut && (
                <Badge className="text-[10px] bg-yellow-500">Special</Badge>
              )}
            </div>
            {item.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                {item.description}
              </p>
            )}
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {item.dietaryTags?.map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <span className="font-bold whitespace-nowrap">
            ${(item.price / 100).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
