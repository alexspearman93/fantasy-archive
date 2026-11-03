-- Fantasy Archive v0.8.1: permit factions as World entries.
-- Existing characters, locations, lore and relationships remain unchanged.
alter table public.archive_entries
 drop constraint if exists archive_entries_entry_type_check;
alter table public.archive_entries
 add constraint archive_entries_entry_type_check
 check (entry_type in ('character','location','lore','faction'));
