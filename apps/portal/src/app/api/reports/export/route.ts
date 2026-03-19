import { NextRequest, NextResponse } from "next/server";

import { arrayToCsv } from "@/lib/export";
import { logger } from "@/lib/logger";

interface ExportRequest {
  type: "daily_sales" | "top_items";
  data: Record<string, unknown>[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ExportRequest;
    const { type, data } = body;

    if (!type || !data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: "Missing required fields: type, data" },
        { status: 400 },
      );
    }

    let headers: string[];
    let rows: string[][];
    let filename: string;

    switch (type) {
      case "daily_sales": {
        headers = ["Date", "Orders", "Revenue"];
        rows = data.map((row) => [
          String(row.date ?? ""),
          String(row.orders ?? 0),
          `$${(Number(row.revenue ?? 0) / 100).toFixed(2)}`,
        ]);
        filename = `daily-sales-${Date.now()}.csv`;
        break;
      }
      case "top_items": {
        headers = ["Item", "Quantity Sold", "Revenue"];
        rows = data.map((row) => [
          String(row.item ?? row.name ?? ""),
          String(row.quantitySold ?? row.quantity ?? 0),
          `$${(Number(row.revenue ?? 0) / 100).toFixed(2)}`,
        ]);
        filename = `top-items-${Date.now()}.csv`;
        break;
      }
      default:
        return NextResponse.json(
          { error: `Unsupported report type: ${type}` },
          { status: 400 },
        );
    }

    const csv = arrayToCsv(headers, rows);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to export report');
    return NextResponse.json(
      { error: "Failed to generate export" },
      { status: 500 },
    );
  }
}
