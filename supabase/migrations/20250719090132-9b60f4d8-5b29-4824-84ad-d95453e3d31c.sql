-- Clean up duplicate RPE logs for scheduled practices
-- Keep only the most recent RPE log for each unique combination of athlete_id, log_date, and activity_type
WITH ranked_rpe AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY athlete_id, log_date, activity_type, 
           SUBSTRING(notes FROM 'RPE for scheduled practice: (.+)')
           ORDER BY updated_at DESC
         ) as rn
  FROM rpe_logs 
  WHERE notes LIKE '%RPE for scheduled practice%'
)
DELETE FROM rpe_logs 
WHERE id IN (
  SELECT id FROM ranked_rpe WHERE rn > 1
);