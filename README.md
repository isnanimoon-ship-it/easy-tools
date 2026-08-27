# 간편도구

Next.js App Router 기반의 한국어 유틸리티 웹사이트입니다.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.
기본 주소는 한국어 페이지인 `http://localhost:3000/ko`로 이동합니다.

## 확인 명령

```bash
npm run lint
npm run type-check
npm run build
```

## 폴더 구조

```text
app/
  [locale]/
    layout.tsx
    page.tsx
    tools/
components/
  layout/
  ui/
i18n/
messages/
```

개별 유틸리티는 이후 `app/[locale]/tools/[tool-name]/page.tsx` 경로에
추가합니다. 사용자에게 표시되는 문구는 `messages/ko.json`,
`messages/en.json`, `messages/ja.json`에서 기능별 네임스페이스로
관리합니다.

프로덕션 canonical URL 생성을 위해 Vercel 환경 변수에
`NEXT_PUBLIC_SITE_URL`을 실제 서비스 주소로 설정할 수 있습니다.
