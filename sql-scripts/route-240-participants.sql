-- SQL Query to get list of participants and their respective amounts (Base, Discount, Fee, Net)
-- Rules based on /pages/routes/purchases.js for Route ID 240

WITH route_info AS (
  SELECT 
    id, 
    amount, 
    couple_price
  FROM public.routes
  WHERE id = 240
),
participants_base AS (
  SELECT
    ep.id AS event_profile_id,
    ep.full_name,
    p.email,
    ep.participant_number,
    ep.referrer,
    ep.is_couple,
    ep.payment_status,
    ep.coupon_code,
    c.discount_percentage,
    -- Determine base price based on couple status (scaled to cents)
    CASE 
      WHEN ep.is_couple THEN ROUND(ri.couple_price * 100)
      ELSE ROUND(ri.amount * 100)
    END AS base_cents_raw
  FROM public.event_profile ep
  JOIN route_info ri ON ep.route_id = ri.id
  LEFT JOIN public.profiles p ON ep.profile_id = p.id
  LEFT JOIN public.coupons c ON ep.coupon_code = c.code
  WHERE ep.participant_number > 0
),
discount_applied AS (
  SELECT
    *,
    -- Calculate discount cents
    ROUND(base_cents_raw * (COALESCE(discount_percentage, 0) / 100.0)) AS discount_cents_raw
  FROM participants_base
),
final_base AS (
  SELECT
    *,
    -- If status is 'promo', all amounts are 0 based on the app logic
    CASE WHEN payment_status = 'promo' THEN 0 ELSE base_cents_raw END AS base_cents,
    CASE WHEN payment_status = 'promo' THEN 0 ELSE discount_cents_raw END AS discount_cents,
    CASE 
      WHEN payment_status = 'promo' THEN 0 
      ELSE GREATEST(base_cents_raw - discount_cents_raw, 0) 
    END AS subtotal_cents
  FROM discount_applied
),
fees_calculated AS (
  SELECT
    *,
    -- Commission logic: 7.2% + $3.00 MXN, then add 16% IVA on the commission
    CASE 
      WHEN payment_status = 'promo' THEN 0
      ELSE 
        -- commission = round(subtotal * 0.072) + 300
        -- tax = round(commission * 0.16)
        -- fee = commission + tax
        (ROUND(subtotal_cents * 0.072) + 300) + 
        ROUND((ROUND(subtotal_cents * 0.072) + 300) * 0.16)
    END AS fee_cents
  FROM final_base
)
SELECT
  full_name AS "Nombre",
  email AS "Email",
  participant_number AS "No.",
  referrer AS "Referrer",
  is_couple AS "Pareja",
  payment_status AS "Status",
  coupon_code AS "Cupón",
  base_cents / 100.0 AS "Precio Base",
  discount_cents / 100.0 AS "Descuento",
  subtotal_cents / 100.0 AS "Subtotal",
  fee_cents / 100.0 AS "Comisión/IVA",
  (subtotal_cents - fee_cents) / 100.0 AS "Total Neto"
FROM fees_calculated
ORDER BY participant_number ASC;
