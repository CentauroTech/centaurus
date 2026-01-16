-- Convert servicios column from text to text array
ALTER TABLE public.tasks 
ALTER COLUMN servicios TYPE text[] 
USING CASE 
  WHEN servicios IS NULL THEN NULL 
  WHEN servicios = '' THEN '{}'::text[]
  ELSE ARRAY[servicios] 
END;

-- Convert formato column from text to text array
ALTER TABLE public.tasks 
ALTER COLUMN formato TYPE text[] 
USING CASE 
  WHEN formato IS NULL THEN NULL 
  WHEN formato = '' THEN '{}'::text[]
  ELSE ARRAY[formato] 
END;