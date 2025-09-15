import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Credit conversion utilities
const CREDITS_PER_DOLLAR = 400

export function formatCreditsWithDollars(credits: number): string {
  const dollars = credits / CREDITS_PER_DOLLAR
  // For small amounts, show more decimal places to avoid $0.00
  if (dollars < 0.01) {
    return `${credits} credits ($${dollars.toFixed(4)})`
  }
  return `${credits} credits ($${dollars.toFixed(2)})`
}

export function formatCreditsWithDollarsShort(credits: number): string {
  const dollars = credits / CREDITS_PER_DOLLAR
  // For small amounts, show more decimal places to avoid $0.00
  if (dollars < 0.01) {
    return `${credits} credits ($${dollars.toFixed(4)})`
  }
  return `${credits} credits ($${dollars.toFixed(2)})`
}

export function getDollarValue(credits: number): number {
  return credits / CREDITS_PER_DOLLAR
}
