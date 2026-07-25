CREATE TABLE IF NOT EXISTS public.ledger_chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accountant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'model')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ledger_chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accountants can view their own chat history" 
ON public.ledger_chat_history FOR SELECT 
USING (auth.uid() = accountant_id);

CREATE POLICY "Accountants can insert their own chat history" 
ON public.ledger_chat_history FOR INSERT 
WITH CHECK (auth.uid() = accountant_id);
