# 아키텍처

## 기술 기준선

- Next.js App Router + TypeScript
- Tailwind CSS
- `next-intl` 기반 `ko`, `en`, `ja`
- 기본은 Server Component, 상호작용이 필요한 최소 경계만 Client Component
- 브라우저 API로 가능한 변환은 로컬 처리

## 폴더 책임

```text
app/
  [locale]/
    tools/[tool-slug]/page.tsx   # 도구별 독립 라우트
components/
  layout/                        # 사이트 전역 레이아웃
  ui/                            # 범용 프리미티브
  tools/[tool-slug]/             # 도구 전용 UI
lib/
  tools/[tool-slug]/             # 순수 도메인 로직
i18n/                            # locale 라우팅/설정
messages/{ko,en,ja}.json          # 사용자 노출 문구
tests/                            # 단위·통합·E2E 테스트
docs/                            # 제품·설계·평가 기준
agents/                          # 역할별 실행 계약
```

실제 폴더는 기능 도입 시 필요에 따라 만든다. 도메인 계산은 UI와 분리된 순수 함수로 두어 테스트 가능하게 한다.

## 설계 규칙

- `strict` TypeScript를 유지하고 `any`는 근거 없이 사용하지 않는다.
- 사용자 문구를 컴포넌트에 하드코딩하지 않는다.
- 모든 locale에서 동일한 기능과 의미를 제공한다. 번역 누락을 fallback으로 숨기지 않는다.
- URL은 `/{locale}/tools/{stable-kebab-case-slug}` 패턴을 사용한다.
- 각 도구는 고유 title, description, canonical, alternates/hreflang을 제공한다.
- 입력 데이터는 기본적으로 메모리에만 두며 서버로 전송하지 않는다. 예외는 SPEC과 UI에 공개한다.
- 무거운 라이브러리는 Web API 또는 작은 유틸리티로 대체 가능한지 먼저 검토한다.
- 오류는 복구 방법을 포함해 사용자에게 표시하며 예상 가능한 오류를 콘솔에 남기지 않는다.

## 공통 컴포넌트 기준

기존 `components/layout`과 `components/ui`를 우선 검토한다. 공통 컴포넌트는 접근 가능한 label, 키보드 조작, focus 상태, disabled/loading/error 상태를 지원해야 한다. 도구 전용 요구를 범용 API에 억지로 넣지 않는다.

## 성능과 보안

- 초기 번들에 도구별 무거운 코드를 포함하지 않으며 필요하면 지연 로드한다.
- 파일 입력은 크기·형식 한도를 검증하고 Object URL 등 임시 자원을 해제한다.
- 사용자 입력을 HTML로 직접 삽입하지 않는다.
- 비밀키를 클라이언트 번들에 넣지 않는다.
- 성능 회귀는 빌드 결과와 실제 모바일 조건에서 확인한다.

## 변경 결정

새 의존성, 서버 기능, 폴더 규칙 변경은 Architect가 대안·비용·영향을 기록한 뒤 승인한다. 작은 되돌릴 수 있는 결정은 코드와 `PROGRESS.md` 기록으로 충분하며, 장기 영향이 큰 결정은 `docs/ARCHITECTURE.md`에 반영한다.
