import { NextResponse } from "next/server";

export async function GET() {
  const keys = Object.keys(process.env).sort();
  return NextResponse.json({ 
    total: keys.length,
    keys,
    DATABASE_URL_present: !!process.env.DATABASE_URL,
    BLOB_present: !!process.env.BLOB_READ_WRITE_TOKEN,
    BLOB_STORE_present: !!process.env.BLOB_STORE_ID,
  });
}
