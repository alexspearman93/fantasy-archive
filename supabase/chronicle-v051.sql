-- Chronicle v0.5.1: keep fast autosaves but limit history checkpoints.
-- One history snapshot per five-minute editing window.
-- Restore operations still preserve the immediately preceding saved version.
create or replace function public.archive_save_chapter(
 p_chapter uuid,p_expected_revision integer,p_title text,p_body text
) returns integer language plpgsql security definer set search_path=''
as $$
declare v_chapter public.chapters%rowtype; v_next integer;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select * into v_chapter from public.chapters where id=p_chapter for update;
 if not found then raise exception 'Chapter not found'; end if;
 if not public.archive_access(v_chapter.project_id,true) then
  raise exception 'Not authorized to edit this chapter';
 end if;
 if v_chapter.revision<>p_expected_revision then
  raise exception 'CHAPTER_CONFLICT: another version was saved. Copy your draft before reloading.';
 end if;
 if v_chapter.title is not distinct from p_title and v_chapter.body is not distinct from p_body then
  return v_chapter.revision;
 end if;
 if not exists(
  select 1 from public.chapter_revisions
  where chapter_id=p_chapter and saved_at>now()-interval '5 minutes'
 ) then
  insert into public.chapter_revisions(chapter_id,project_id,revision,title,body,saved_by)
  values(v_chapter.id,v_chapter.project_id,v_chapter.revision,v_chapter.title,v_chapter.body,auth.uid())
  on conflict(chapter_id,revision) do nothing;
 end if;
 v_next:=v_chapter.revision+1;
 update public.chapters set title=p_title,body=p_body,revision=v_next where id=p_chapter;
 return v_next;
end;
$$;

create or replace function public.archive_restore_chapter(
 p_chapter uuid,p_expected_revision integer,p_restore_revision integer
) returns integer language plpgsql security definer set search_path=''
as $$
declare v_chapter public.chapters%rowtype; v_old public.chapter_revisions%rowtype; v_next integer;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select * into v_chapter from public.chapters where id=p_chapter for update;
 if not found then raise exception 'Chapter not found'; end if;
 if not public.archive_access(v_chapter.project_id,true) then raise exception 'Not authorized'; end if;
 if v_chapter.revision<>p_expected_revision then raise exception 'CHAPTER_CONFLICT: newer version exists'; end if;
 select * into v_old from public.chapter_revisions where chapter_id=p_chapter and revision=p_restore_revision;
 if not found then raise exception 'Revision not found'; end if;
 insert into public.chapter_revisions(chapter_id,project_id,revision,title,body,saved_by)
 values(v_chapter.id,v_chapter.project_id,v_chapter.revision,v_chapter.title,v_chapter.body,auth.uid())
 on conflict(chapter_id,revision) do nothing;
 v_next:=v_chapter.revision+1;
 update public.chapters set title=v_old.title,body=v_old.body,revision=v_next where id=p_chapter;
 return v_next;
end;
$$;
