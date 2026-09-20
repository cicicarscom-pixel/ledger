UPDATE storage.buckets
SET public = false
WHERE id IN ('invoices', 'finance_receipts', 'documents');
