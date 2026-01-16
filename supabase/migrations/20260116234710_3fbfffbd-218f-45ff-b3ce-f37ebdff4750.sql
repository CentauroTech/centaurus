-- Change prueba_de_voz from boolean to text to support dropdown options
ALTER TABLE public.tasks 
ALTER COLUMN prueba_de_voz TYPE text 
USING CASE 
  WHEN prueba_de_voz = true THEN 'Yes'
  WHEN prueba_de_voz = false THEN 'No'
  ELSE NULL
END;