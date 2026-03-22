import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireTenantAccess, assertTenantOwnership } from "../lib/tenant_auth";

/**
 * Update a single table's floor plan position and dimensions.
 * Used when dragging/resizing a table in the visual floor plan editor.
 */
export const updateTablePosition = mutation({
  args: {
    tableId: v.id("tables"),
    posX: v.number(),
    posY: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    shape: v.optional(
      v.union(
        v.literal("circle"),
        v.literal("square"),
        v.literal("rectangle")
      )
    ),
    rotation: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    const table = await ctx.db.get(args.tableId);
    assertTenantOwnership(table, user.tenantId);

    const updates: Record<string, unknown> = {
      posX: args.posX,
      posY: args.posY,
    };
    if (args.width !== undefined) updates.width = args.width;
    if (args.height !== undefined) updates.height = args.height;
    if (args.shape !== undefined) updates.shape = args.shape;
    if (args.rotation !== undefined) updates.rotation = args.rotation;

    await ctx.db.patch(args.tableId, updates);
  },
});

/**
 * Update a table's section and/or floor assignment.
 */
export const updateTableSection = mutation({
  args: {
    tableId: v.id("tables"),
    section: v.optional(v.string()),
    floor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);
    const table = await ctx.db.get(args.tableId);
    assertTenantOwnership(table, user.tenantId);

    const updates: Record<string, unknown> = {};
    if (args.section !== undefined) updates.section = args.section;
    if (args.floor !== undefined) updates.floor = args.floor;

    await ctx.db.patch(args.tableId, updates);
  },
});

/**
 * Bulk-update multiple table positions after a floor plan editing session.
 * Accepts an array of table position updates and applies them atomically.
 */
export const bulkUpdateTablePositions = mutation({
  args: {
    tables: v.array(
      v.object({
        tableId: v.id("tables"),
        posX: v.number(),
        posY: v.number(),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        shape: v.optional(
          v.union(
            v.literal("circle"),
            v.literal("square"),
            v.literal("rectangle")
          )
        ),
        rotation: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireTenantAccess(ctx);

    // Validate all tables belong to the user's tenant before applying any updates
    const tableRecords = await Promise.all(
      args.tables.map(async (t) => {
        const table = await ctx.db.get(t.tableId);
        assertTenantOwnership(table, user.tenantId);
        return table;
      })
    );

    // All validations passed — apply updates
    for (let i = 0; i < args.tables.length; i++) {
      const t = args.tables[i]!;
      const tableRecord = tableRecords[i]!;
      const updates: Record<string, unknown> = {
        posX: t.posX,
        posY: t.posY,
      };
      if (t.width !== undefined) updates.width = t.width;
      if (t.height !== undefined) updates.height = t.height;
      if (t.shape !== undefined) updates.shape = t.shape;
      if (t.rotation !== undefined) updates.rotation = t.rotation;

      await ctx.db.patch(tableRecord._id, updates);
    }
  },
});
