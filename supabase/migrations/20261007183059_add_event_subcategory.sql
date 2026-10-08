-- Add subcategory column to events to support hierarchical grouping (e.g., Olympiad and Quiz -> Quiz / Olympiad)
alter table public.events
  add column if not exists subcategory text;
