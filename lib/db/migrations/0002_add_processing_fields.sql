ALTER TABLE Invoice
ADD COLUMN IF NOT EXISTS extraction_method TEXT,
ADD COLUMN IF NOT EXISTS processing_errors TEXT; 