// app/api/stripe/status/route.ts
import { NextResponse } from "next/server"


export async function GET() {
  // Stripe Connect removed - no need to check status
  return NextResponse.json({ 
    connected: false, 
    message: "Stripe Connect removed - all sales go to main account" 
  })
}
