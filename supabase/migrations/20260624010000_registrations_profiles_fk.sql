-- Alter registrations table to reference profiles(id) instead of auth.users(id)
ALTER TABLE public.registrations
DROP CONSTRAINT IF EXISTS registrations_user_id_fkey,
ADD CONSTRAINT registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
