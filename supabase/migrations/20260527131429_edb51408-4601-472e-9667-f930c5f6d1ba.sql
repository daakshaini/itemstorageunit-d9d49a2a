
-- Backfill activity_logs.details for existing rows so the admin
-- Transaction History shows Quantity / Net Qty for past entries.

-- 1) For "create" rows: use the current item's quantity (best estimate of
-- what was added; net_quantity equals current quantity for the create event).
UPDATE public.activity_logs al
SET details = jsonb_build_object(
  'quantity', i.quantity,
  'net_quantity', i.quantity,
  'part_number', i.part_number
)
FROM public.items i
WHERE al.item_id = i.id
  AND al.action = 'create'
  AND al.details IS NULL;

-- 2) For old "update" rows that stored {from, to}: convert to the new shape.
UPDATE public.activity_logs
SET details = jsonb_build_object(
  'quantity', ABS( (details->>'to')::int - (details->>'from')::int ),
  'net_quantity', (details->>'to')::int,
  'direction', CASE WHEN (details->>'to')::int >= (details->>'from')::int THEN 'add' ELSE 'remove' END
)
WHERE action = 'update'
  AND details ? 'from'
  AND details ? 'to';

-- 3) For "delete" rows with null details: we don't know the historical
-- quantity, but we can mark net_quantity as 0.
UPDATE public.activity_logs
SET details = jsonb_build_object('net_quantity', 0)
WHERE action = 'delete' AND details IS NULL;
