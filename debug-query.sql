-- Check all profiles and their account_type values
SELECT
  id,
  full_name,
  username,
  email,
  account_type,
  LENGTH(account_type) as type_length,
  ASCII(SUBSTRING(account_type FROM 1 FOR 1)) as first_char_ascii
FROM profiles
WHERE username IS NOT NULL
ORDER BY updated_at DESC;

-- This will show:
-- 1. All profiles with usernames
-- 2. The exact account_type value (watch for trailing spaces or case differences)
-- 3. The length (to catch invisible characters)
-- 4. The ASCII code of the first character (to catch encoding issues)
