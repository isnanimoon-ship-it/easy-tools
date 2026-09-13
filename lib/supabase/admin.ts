import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * service_role 키를 쓰는 서버 전용 클라이언트. RLS를 우회하므로 Route Handler 등
 * 신뢰된 서버 코드에서만 생성한다. "server-only" import가 클라이언트 번들 유입을 빌드 타임에 막는다.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
