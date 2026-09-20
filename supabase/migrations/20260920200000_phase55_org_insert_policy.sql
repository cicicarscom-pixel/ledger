-- Add INSERT policy for organizations so callback route can create it
CREATE POLICY "Users can insert own organization" 
ON public.organizations 
FOR INSERT 
WITH CHECK (auth.uid() = owner_id);
