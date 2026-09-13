import { createClient } from "@supabase/supabase-js";

/**
 * anon 키를 쓰는 읽기 전용 클라이언트. RLS의 "public read popularity" 정책 덕분에
 * tool_popularity만 읽을 수 있고, tool_visit_events는 정책이 없어 여전히 접근할 수 없다.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase public client requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
