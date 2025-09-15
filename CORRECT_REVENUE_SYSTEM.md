# Correct Revenue System - Cardify

## **What I Was Confusing (WRONG):**

I was trying to modify `marketplace_transactions` table, but that's **NOT** where sales are tracked for revenue calculation.

## **The Actual System (CORRECT):**

### **1. `asset_buyers` Table** - This is where sales are recorded
```json
[
  {
    "asset_id": "0fa2a844-3f04-4260-b823-0d70ed4313cb",
    "buyer_id": "499c5602-7b77-4357-8363-1d3b838d6132",
    "seller_id": "cd031750-f666-4351-acc4-8655d17f7376",
    "purchase_amount_cents": 900,
    "purchased_at": "2025-09-01 06:19:09.638271+00"
  }
]
```

**This table records every sale** - when someone buys a card, it gets added here.

### **2. `revenue_requests` Table** - Payment/credit requests
```json
[
  {
    "user_id": "cd031750-f666-4351-acc4-8655d17f7376",
    "amount_cents": 400,
    "request_type": "stripe_payment",
    "status": "pending"
  }
]
```

**This table tracks user requests** for either Stripe payments or credit conversion.

## **The Correct Revenue Logic:**

### **Step 1: Count Sales from `asset_buyers`**
```sql
-- Count all sales for a seller
SELECT COUNT(*) FROM asset_buyers 
WHERE seller_id = 'user_id';
```

### **Step 2: Exclude Processed Sales**
```sql
-- Only count sales that haven't been processed yet
SELECT COUNT(*) FROM asset_buyers ab
JOIN revenue_tracking rt ON ab.id = rt.asset_buyer_id
WHERE ab.seller_id = 'user_id' 
AND rt.revenue_status = 'available';
```

### **Step 3: Calculate Revenue**
```typescript
// Only count sales with available revenue
const totalSales = salesData.length // sales with revenue_status = 'available'
const totalRevenue = totalSales * 200 // $2 per sale
```

## **Revenue Status Tracking:**

### **New Table: `revenue_tracking`**
```sql
CREATE TABLE revenue_tracking (
    id UUID PRIMARY KEY,
    asset_buyer_id UUID REFERENCES asset_buyers(id),
    seller_id UUID REFERENCES profiles(id),
    revenue_status TEXT DEFAULT 'available' 
        CHECK (revenue_status IN ('available', 'payment_requested', 'credited')),
    revenue_request_id UUID REFERENCES revenue_requests(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### **Revenue Status Values:**
- **`available`** - Revenue can be claimed (default)
- **`payment_requested`** - Revenue requested via Stripe
- **`credited`** - Revenue converted to credits

## **How It Works:**

### **Scenario 1: New Sales**
1. **5 cards sold** → Added to `asset_buyers`
2. **Revenue tracking** → All 5 have `revenue_status = 'available'`
3. **Profile shows** → Revenue: $10 ($2 × 5 sales)

### **Scenario 2: Request Stripe Payment**
1. **Request payment** → All 5 sales marked as `revenue_status = 'payment_requested'`
2. **Profile shows** → Revenue: $0 (no available revenue)
3. **New sales** → Only new sales count towards revenue

### **Scenario 3: Claim Credits**
1. **Claim credits** → All available sales marked as `revenue_status = 'credited'`
2. **Profile shows** → Revenue: $0 (no available revenue)
3. **New sales** → Only new sales count towards revenue

## **Benefits of This Approach:**

1. **Uses correct table** - `asset_buyers` (actual sales)
2. **Separate tracking** - Revenue status independent of payment requests
3. **Clean separation** - Sales tracking vs payment processing
4. **No confusion** - Clear distinction between systems
5. **Accurate revenue** - Only shows unprocessed sales

## **Database Changes Needed:**

### **1. Create revenue_tracking table**
```sql
-- Run the correct-revenue-system.sql script
```

### **2. Update frontend**
- Use `asset_buyers` table for sales counting
- Join with `revenue_tracking` for status filtering
- Update `revenue_status` when processing revenue

This approach keeps the systems completely separate while ensuring accurate revenue tracking! 🎯
