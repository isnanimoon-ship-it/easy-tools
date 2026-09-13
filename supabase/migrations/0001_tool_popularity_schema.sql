-- 도구 조회수 집계: 원본 로그 + 집계 테이블 + 방문 기록 함수
-- Supabase SQL Editor(또는 CLI)에서 0001, 0002 순서로 실행하세요.

-- 1) 원본 방문 로그
-- visitor_hash = sha256(ip + "|" + userAgent + "|" + UTC날짜) — IP 원문은 저장하지 않음.
-- 8일 지난 행은 0002의 cleanup 함수가 주기적으로 삭제한다(개인정보 최소화, 인덱스 크기 관리).
create table if not exists public.tool_visit_events (
  id bigint generated always as identity primary key,
  tool_slug text not null,
  visitor_hash text not null,
  visited_at timestamptz not null default now()
);

-- 방문 시마다 "이 slug를 이 방문자가 최근 30분 안에 봤는가"를 확인하는 dedup 조회용 인덱스.
create index if not exists tool_visit_events_dedup_idx
  on public.tool_visit_events (tool_slug, visitor_hash, visited_at desc);

-- 집계 배치(0002)가 최근 N일 범위를 스캔할 때 사용하는 인덱스.
create index if not exists tool_visit_events_visited_at_idx
  on public.tool_visit_events (visited_at);

alter table public.tool_visit_events enable row level security;
-- 의도적으로 anon/authenticated 정책을 하나도 만들지 않는다.
-- 즉 이 테이블은 service_role(서버 전용 키)로만 접근 가능하고, 브라우저에서는 절대 읽거나 쓸 수 없다.

-- 2) 집계(캐시) 테이블 — 랭킹 위젯이 유일하게 읽는 테이블
create table if not exists public.tool_popularity (
  tool_slug text primary key,
  realtime_count integer not null default 0,
  weekly_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.tool_popularity enable row level security;

drop policy if exists "public read popularity" on public.tool_popularity;
create policy "public read popularity" on public.tool_popularity
  for select
  to anon, authenticated
  using (true);
-- insert/update/delete 정책은 없음 — 쓰기는 0002의 refresh 함수(service_role)만 수행한다.

-- 3) 방문 기록 함수: 30분 이내 dedup 키가 있으면 아무것도 하지 않고, 없으면 insert.
-- security definer + 고정 search_path로 함수를 소유자 권한으로 안전하게 실행한다.
create or replace function public.log_tool_visit(p_tool_slug text, p_visitor_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recently_visited boolean;
begin
  select exists (
    select 1
    from public.tool_visit_events
    where tool_slug = p_tool_slug
      and visitor_hash = p_visitor_hash
      and visited_at > now() - interval '30 minutes'
  ) into v_recently_visited;

  if v_recently_visited then
    return false;
  end if;

  insert into public.tool_visit_events (tool_slug, visitor_hash)
  values (p_tool_slug, p_visitor_hash);

  return true;
end;
$$;

-- anon/authenticated가 이 함수를 직접 호출하지 못하도록 명시적으로 차단한다.
-- Route Handler는 service_role 키로 접속하므로 아래 revoke와 무관하게 계속 호출 가능하다.
revoke all on function public.log_tool_visit(text, text) from public, anon, authenticated;
grant execute on function public.log_tool_visit(text, text) to service_role;
