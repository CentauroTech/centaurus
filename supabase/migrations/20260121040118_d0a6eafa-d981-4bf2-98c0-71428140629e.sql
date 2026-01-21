-- Add birthday column to billing_profiles
ALTER TABLE public.billing_profiles
ADD COLUMN birthday date NULL;