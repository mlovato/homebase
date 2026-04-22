import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { handleGetServices } from "./handler";

export async function GET() {
  return NextResponse.json(handleGetServices(getDb()));
}
