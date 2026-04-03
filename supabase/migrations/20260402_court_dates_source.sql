-- Add source column to court_dates to distinguish auto-scraped vs manually entered dates
ALTER TABLE court_dates
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'scraped'));
