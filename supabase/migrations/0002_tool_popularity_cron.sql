-- 집계 배치 + 정리 작업을 pg_cron으로 스케줄링한다.
-- 먼저 Supabase 대시보드 → Database → Extensions에서 "pg_cron"을 활성화한 뒤 이 파일을 실행하세요.
-- (프로젝트에 따라 아래 한 줄로도 활성화되지만, 권한 문제가 있으면 대시보드 UI를 사용하세요.)
create extension if not exists pg_cron with schema pg_catalog;

-- 실시간(24시간)/이번 주(7일) 조회수를 tool_visit_events에서 한 번에 계산해 tool_popularity에 반영한다.
-- 최근 7일 방문이 아예 없는 도구는 0으로 리셋해 랭킹에서 자연스럽게 빠지게 한다.
create or replace function public.refresh_tool_popularity()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tool_popularity (tool_slug, realtime_count, weekly_count, updated_at)
  select
    tool_slug,
    count(*) filter (where visited_at > now() - interval '24 hours') as realtime_count,
    count(*) filter (where visited_at > now() - interval '7 days') as weekly_count,
    now()
  from public.tool_visit_events
  where visited_at > now() - interval '7 days'
  group by tool_slug
  on conflict (tool_slug) do update
    set realtime_count = excluded.realtime_count,
        weekly_count = excluded.weekly_count,
        updated_at = excluded.updated_at;

  update public.tool_popularity
  set realtime_count = 0,
      weekly_count = 0,
      updated_at = now()
  where tool_slug not in (
    select tool_slug from public.tool_visit_events where visited_at > now() - interval '7 days'
  )
  and (realtime_count <> 0 or weekly_count <> 0);
end;
$$;

-- 8일 지난 원본 로그를 삭제한다(dedup에 필요한 30분 창과 집계에 필요한 7일보다 여유를 둔 값).
create or replace function public.cleanup_tool_visit_events()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.tool_visit_events where visited_at < now() - interval '8 days';
$$;

select cron.unschedule(jobid) from cron.job where jobname = 'refresh-tool-popularity';
select cron.unschedule(jobid) from cron.job where jobname = 'cleanup-tool-visit-events';

-- 5분마다 재계산 → 랭킹 위젯의 "마지막 업데이트"가 최대 5분 전 값을 가리킨다.
select cron.schedule(
  'refresh-tool-popularity',
  '*/5 * * * *',
  $$select public.refresh_tool_popularity();$$
);

-- 18:00 UTC = 03:00 KST, 트래픽이 가장 적은 시간대에 정리 작업을 실행한다.
select cron.schedule(
  'cleanup-tool-visit-events',
  '0 18 * * *',
  $$select public.cleanup_tool_visit_events();$$
);
