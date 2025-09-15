# Database Structure Explained - Cardify

## **Key Tables & Their Purpose**

### 1. **`marketplace_transactions`** - Sales History
**Purpose**: Records when cards are actually **SOLD** and money changes hands.

**Key Fields:**
- `seller_id` - Who sold the card
- `buyer_id` - Who bought the card  
- `amount_cents` - How much was paid
- `status` - Transaction status ('completed', 'pending', etc.)
- `payment_status` - Payment processing status ('pending', 'settled', 'credited', 'cancelled')

**What This Means:**
- ✅ **Counts towards revenue** - These are actual sales
- ✅ **Shows completed transactions** - Money was exchanged
- ✅ **Used for revenue calculation** - $2 per completed sale

---

### 2. **`marketplace_listings`** - Available Cards
**Purpose**: Records cards that are **FOR SALE** (not necessarily sold).

**Key Fields:**
- `seller_id` - Who is selling the card
- `price_cents` - How much they want for it
- `status` - Listing status ('active', 'inactive', 'sold')
- `buyer_id` - NULL until someone buys it

**What This Means:**
- ❌ **Does NOT count towards revenue** - These are just listings
- ❌ **Shows available inventory** - Cards waiting to be sold
- ❌ **Not used for revenue calculation** - No money exchanged yet

---

## **Real Example from Your Data**

### **`marketplace_transactions`** (Sales - Counts Towards Revenue)
```json
[
  {
    "seller_id": "cd031750-f666-4351-acc4-8655d17f7376",
    "amount_cents": 900,
    "status": "completed",
    "payment_status": "settled"
  },
  {
    "seller_id": "cd031750-f666-4351-acc4-8655d17f7376", 
    "amount_cents": 900,
    "status": "completed",
    "payment_status": "settled"
  }
]
```
**Result**: 2 completed sales = $4 revenue ($2 × 2 sales)

---

### **`marketplace_listings`** (Inventory - Does NOT Count Towards Revenue)
```json
[
  {
    "seller_id": "cd031750-f666-4351-acc4-8655d17f7376",
    "price_cents": 900,
    "status": "active",
    "buyer_id": null
  },
  {
    "seller_id": "cd031750-f666-4351-acc4-8655d17f7376",
    "price_cents": 900, 
    "status": "active",
    "buyer_id": null
  },
  {
    "seller_id": "cd031750-f666-4351-acc4-8655d17f7376",
    "price_cents": 900,
    "status": "inactive", 
    "buyer_id": null
  }
]
```
**Result**: 3 listings (2 active, 1 inactive) = $0 revenue (not sold yet)

---

## **Why This Matters**

### **Revenue Calculation**
```typescript
// ✅ CORRECT: Count only completed sales
const { data: salesData } = await supabase
  .from('marketplace_transactions')  // Sales history
  .select('amount_cents, payment_status')
  .eq('seller_id', userId)
  .in('payment_status', ['pending', 'settled'])

// ❌ WRONG: Don't count listings
const { data: listingsData } = await supabase
  .from('marketplace_listings')     // Available inventory
  .select('price_cents')
  .eq('seller_id', userId)
  .eq('status', 'active')
```

### **Business Logic**
1. **Listings** = Cards available for purchase (no revenue yet)
2. **Transactions** = Cards actually sold (counts towards revenue)
3. **Payment Status** = Whether revenue has been processed

---

## **Current Status in Your System**

- **Completed Sales**: 2 (from `marketplace_transactions`)
- **Available Revenue**: $4 (2 sales × $2 per sale)
- **Active Listings**: 2 (from `marketplace_listings`) 
- **Inactive Listings**: 1 (from `marketplace_listings`)

**This is correct!** You have 2 completed sales generating $4 revenue, plus 3 cards listed for sale (2 active, 1 inactive).

---

## **What Happens When You Claim Credits**

1. **Sales remain** in `marketplace_transactions` (historical record)
2. **Payment status changes** to `'credited'` (no longer counts towards revenue)
3. **Revenue resets** to $0 (because all sales are now credited)
4. **Listings remain** unchanged (still available for future sales)

This prevents double-counting while maintaining complete sales history! 🎯
