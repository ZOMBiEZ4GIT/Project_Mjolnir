import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    // Execute a simple query to verify database connection
    await db.execute(sql`SELECT 1`);

    return NextResponse.json({
      status: "ok",
      database: "connected",
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
      },
      { status: 500 }
    );
  }
}
