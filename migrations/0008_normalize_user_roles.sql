-- Preview the number of rows that would change
-- Run this first to inspect before applying the update
SELECT role, count(*) as cnt
FROM users
GROUP BY role
ORDER BY cnt DESC;

-- Preview exact differences (shows rows where trimmed/lower differs)
SELECT id, role, lower(trim(role)) as normalized_role
FROM users
WHERE role IS NOT NULL AND role <> lower(trim(role))
ORDER BY id
LIMIT 100;

-- One-time normalization: update role values to lower(trim(role))
-- Make sure you have a backup or run inside a transaction if you want to review first.
BEGIN;
UPDATE users
SET role = lower(trim(role))
WHERE role IS NOT NULL AND role <> lower(trim(role));
COMMIT;

-- Verify changes
SELECT role, count(*) as cnt
FROM users
GROUP BY role
ORDER BY cnt DESC;
