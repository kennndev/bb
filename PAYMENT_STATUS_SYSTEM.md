# Payment Status System for Cardify

## Overview
The new payment status system tracks the lifecycle of marketplace transactions to properly calculate revenue and prevent double-counting of payments.

## Database Changes

### 1. New Column Added
```sql
ALTER TABLE marketplace_transactions 
ADD COLUMN payment_status TEXT DEFAULT 'pending' 
CHECK (payment_status IN ('pending', 'settled', 'credited', 'cancelled'));
```

### 2. Payment Status Values
- **`pending`** - Payment not yet processed (default)
- **`settled`** - Payment settled via Stripe but not yet converted to credits
- **`credited`** - Revenue converted to credits (no longer counts towards revenue)
- **`cancelled`** - Payment request cancelled

## How It Works

### Revenue Calculation
```typescript
// Only count transactions with payment_status = 'pending' or 'settled'
const { data: salesData } = await supabase
  .from('marketplace_transactions')
  .select('amount_cents, payment_status')
  .eq('seller_id', userId)
  .in('payment_status', ['pending', 'settled']) // Excludes 'credited' transactions
```

### Payment Lifecycle
1. **Sale Completed** → `payment_status = 'pending'`
2. **Stripe Payment Settled** → `payment_status = 'settled'` (still counts towards revenue)
3. **Credits Claimed** → `payment_status = 'credited'` (no longer counts towards revenue)

## Frontend Features

### 1. Revenue Display
- Shows only **pending** and **settled** payments
- Excludes **credited** payments (already converted)
- Real-time updates when payment status changes

### 2. Payment Requests Management
- View all payment requests (Stripe + Credit conversions)
- Mark Stripe payments as "Settled"
- Cancel pending payment requests
- See payment history and status

### 3. Action Buttons
- **Mark Settled**: Updates `payment_status` to 'settled'
- **Cancel**: Cancels the payment request
- **Convert to Credits**: Changes `payment_status` to 'credited'

## Database Queries

### Check Current Payment Statuses
```sql
SELECT 
    status,
    payment_status,
    COUNT(*) as count
FROM marketplace_transactions 
GROUP BY status, payment_status
ORDER BY status, payment_status;
```

### Update Payment Status to Credited
```sql
UPDATE marketplace_transactions 
SET payment_status = 'credited'
WHERE seller_id = 'user_id' 
AND payment_status IN ('pending', 'settled');
```

### Revenue Calculation Query
```sql
SELECT 
    COUNT(*) as total_sales,
    SUM(amount_cents) as total_amount_cents
FROM marketplace_transactions 
WHERE seller_id = 'user_id'
AND payment_status IN ('pending', 'settled');
```

## Benefits

1. **Accurate Revenue**: Only shows revenue from unprocessed payments
2. **No Double-Counting**: Credited payments don't appear in revenue
3. **Payment Tracking**: Clear visibility into payment lifecycle
4. **Admin Control**: Admins can mark payments as settled
5. **Audit Trail**: Complete history of payment status changes

## Migration Steps

1. **Run the SQL script** to add `payment_status` column
2. **Update existing records** to set appropriate statuses
3. **Deploy frontend changes** to use new payment status logic
4. **Test the system** with real payment scenarios

## Testing Scenarios

1. **New Sale**: Should show `payment_status = 'pending'`
2. **Stripe Settlement**: Should update to `payment_status = 'settled'`
3. **Credit Conversion**: Should change to `payment_status = 'credited'`
4. **Revenue Display**: Should only count pending + settled payments
5. **Multiple Claims**: Should prevent claiming already-credited revenue
