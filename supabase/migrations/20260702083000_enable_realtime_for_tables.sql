-- Enable Realtime for appointments, notifications, and activity_logs tables
do $$
begin
  -- Check and add appointments to supabase_realtime publication
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_class c on pr.prrelid = c.oid
    join pg_publication p on pr.prpubid = p.oid
    where p.pubname = 'supabase_realtime' and c.relname = 'appointments'
  ) then
    alter publication supabase_realtime add table appointments;
  end if;

  -- Check and add notifications to supabase_realtime publication
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_class c on pr.prrelid = c.oid
    join pg_publication p on pr.prpubid = p.oid
    where p.pubname = 'supabase_realtime' and c.relname = 'notifications'
  ) then
    alter publication supabase_realtime add table notifications;
  end if;

  -- Check and add activity_logs to supabase_realtime publication
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_class c on pr.prrelid = c.oid
    join pg_publication p on pr.prpubid = p.oid
    where p.pubname = 'supabase_realtime' and c.relname = 'activity_logs'
  ) then
    alter publication supabase_realtime add table activity_logs;
  end if;
end
$$;
