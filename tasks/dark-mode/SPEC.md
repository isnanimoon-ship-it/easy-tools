# 전역 다크 모드 / Global Dark Mode SPEC

## 문서 상태

- 상태: `DONE`
- 작성일: 2026-08-29
- 적용 범위: 전체 사이트 `/{locale}` 및 모든 도구 URL
- 지원 locale: `ko`, `en`, `ja`
- 우선순위: P0 전역 UX 개선
- 유일한 구현 기준: 이 문서
- 현재 단계: Builder → Critic → QA → Optimizer → 재검증 완료
- 구현 상태: 완료 (개선 1/5)

## 1. 목적과 사용자 가치

사용자가 사이트 전체를 라이트 또는 다크 테마로 전환하고, 선택한 테마가 페이지 이동과 다음 방문에도 일관되게 유지되도록 한다. 첫 방문에는 운영체제 선호 테마를 존중한다. 다크 모드는 색상만 바꾸는 장식 기능이 아니라 모든 도구의 입력·결과·경고·오류·메뉴를 읽고 조작할 수 있어야 하는 전역 접근성 기능이다.

성공 기준은 다음과 같다.

1. 첫 화면이 그려지기 전에 올바른 테마가 결정되어 잘못된 테마가 번쩍이지 않는다.
2. Header의 한 control로 모든 페이지가 즉시 라이트/다크 전환된다.
3. locale 또는 도구 URL을 이동하거나 새로고침해도 사용자 선택이 유지된다.
4. 본문·surface·입력·메뉴·상태 색상이 다크 배경에서도 충분히 읽힌다.
5. 기존 12개 도구의 기능·콘솔·모바일·SEO에 회귀가 없다.

## 2. 사용자 계약

### 초기 테마

- 저장된 사용자 선택이 없으면 `prefers-color-scheme: dark` 결과를 따른다.
- 시스템이 dark면 dark, 그 외에는 light로 시작한다.
- 사용자가 아직 직접 선택하지 않은 동안 시스템 선호가 변경되면 열린 페이지도 새 선호를 반영한다.
- JavaScript를 사용할 수 없는 환경에서는 CSS `prefers-color-scheme` fallback으로 읽을 수 있는 테마를 제공한다. toggle과 영속 저장은 동작하지 않을 수 있다.

### 수동 전환

- Header 오른쪽의 언어 선택기 근처에 항상 보이는 단일 theme toggle을 둔다.
- 현재 테마가 아니라 **누르면 적용될 테마**를 accessible name으로 알린다.
  - light 상태: “다크 모드 켜기” / “Enable dark mode” / “ダークモードをオン”
  - dark 상태: “라이트 모드 켜기” / “Enable light mode” / “ライトモードをオン”
- 시각적으로 Sun/Moon icon을 사용하되 icon만으로 의미를 전달하지 않는다. 좁은 화면에서는 visible text를 숨길 수 있지만 accessible name은 유지한다.
- native `button type="button"`을 사용하고 키보드 Enter/Space, visible focus, 최소 44×44px target을 제공한다.
- toggle 후 별도 toast는 필수가 아니다. icon, accessible name, 페이지 색상이 즉시 바뀌어야 한다.

### 저장 정책

- localStorage key: `konly-theme`.
- 저장 가능한 값: `light`, `dark`만 허용한다.
- 누락되거나 다른 값이면 시스템 선호로 fallback한다.
- 테마는 민감 정보가 아니며 서버·cookie·URL query/hash로 전송하거나 복제하지 않는다.
- 첫 수동 toggle부터 명시적 사용자 선택으로 저장한다.
- 첫 버전에는 “시스템 설정으로 재설정” UI를 넣지 않는다. 저장값 삭제는 향후 설정 menu에서 Should Have로 검토한다.

## 3. 범위와 우선순위

### Must Have

- 전체 사이트 light/dark 전환
- 첫 방문 system preference 적용
- `konly-theme`에 수동 선택 저장
- navigation·locale 변경·reload 후 유지
- 초기 theme flash와 hydration mismatch 방지
- Header toggle, ko/en/ja label, keyboard·screen reader 접근성
- home, header, dropdown menu, language select, footer, 모든 도구 page 적용
- input, textarea, select, button, code/pre, card, modal/dropdown, result panel 적용
- normal·muted·disabled·hover·focus·selected 상태 적용
- success, warning, error, info 상태의 dark palette와 비색상 단서 유지
- browser form control과 scrollbar가 가능한 범위에서 현재 theme에 맞도록 `color-scheme` 적용
- 이미지·QR·canvas·업로드 preview·색상 추출 결과 등 사용자 콘텐츠를 CSS filter로 변형하지 않음
- 기존 기능·SEO·모바일·콘솔 회귀 테스트

### Should Have — 첫 구현에 포함

- semantic color token을 `globals.css`에 정의하고 전역 layout·공통 component부터 적용
- theme 변경 시 짧은 색상 transition을 제공하되 `prefers-reduced-motion: reduce`에서는 제거
- 브라우저 system theme가 사용자 선택 전에 실시간 변경되면 반영
- Playwright에서 light/dark 두 모드의 핵심 페이지 screenshot artifact 생성
- theme-color metadata 또는 동등한 browser chrome 색상 반영 가능성을 검토하되 hydration/metadata 제약이 있으면 제외 근거 기록

### Could Have — 별도 승인 필요

- Light / Dark / System 3단 선택 UI
- “시스템 설정 사용” reset button
- 사용자 지정 accent color
- 특정 도구별 theme 예외 설정
- 자동 시간대 기반 야간 전환

### Do Not Build — 첫 버전

- 로그인 계정에 theme 저장
- 서버 DB·API·cookie 기반 theme 동기화
- URL parameter로 theme 공유
- CSS `filter: invert()`로 사이트 전체 반전
- 사용자 이미지, QR, canvas, video thumbnail 색상 변경
- 다크 모드를 이유로 기능 layout·정보 구조·도구 동작 변경
- 신규 theme library 설치. 현재 React·CSS·Tailwind만으로 구현

## 4. Architect 결정

### 4.1 Theme state 모델

저장 상태와 해석 상태를 구분한다.

```ts
type StoredTheme = "light" | "dark" | null;
type ResolvedTheme = "light" | "dark";
```

- `StoredTheme=null`은 system preference를 따른다는 뜻이다.
- DOM의 단일 source of truth는 `<html class="dark" data-theme="dark">` 또는 `<html data-theme="light">`다.
- React state는 DOM의 현재 resolved theme를 읽어 UI icon과 label을 동기화한다.
- 여러 tab의 즉시 동기화는 Must가 아니다. 같은 tab의 navigation/reload 영속성이 Must다. `storage` event를 이용한 다중 tab 동기화는 Should로 구현 가능하다.

### 4.2 초기 깜빡임과 hydration 방지

- `<html>` 안에서 body content보다 먼저 실행되는 최소 inline bootstrap script를 사용한다.
- script는 다음 순서만 수행한다.
  1. `localStorage.getItem("konly-theme")`를 `try/catch`로 읽는다.
  2. 값이 light/dark가 아니면 `matchMedia("(prefers-color-scheme: dark)")`를 확인한다.
  3. `<html>`의 `classList`, `data-theme`, `style.colorScheme`를 설정한다.
- script는 고정된 내부 문자열만 사용하며 사용자 입력을 HTML/JavaScript에 삽입하지 않는다.
- `<html suppressHydrationWarning>`는 bootstrap이 class/data attribute를 바꾸는 의도된 차이에만 사용한다. subtree 오류를 숨기는 용도로 사용하지 않는다.
- React 첫 render에서 서버가 임의로 theme icon을 확정해 hydration mismatch를 만들지 않는다. mount 전에는 안정적인 중립 placeholder 또는 DOM 값 기반 외부 store 패턴을 사용한다.
- localStorage 또는 matchMedia 접근 실패 시 light로 안전하게 fallback하고 console error를 남기지 않는다.

### 4.3 Tailwind CSS 4와 theme selector

`globals.css`에 selector 기반 dark variant를 명시한다.

```css
@custom-variant dark (&:where(.dark, .dark *));
```

system media query만으로 모든 dark style을 적용하지 않는다. 수동 선택이 system preference보다 우선해야 하기 때문이다.

### 4.4 Semantic color token

기존 `--background`, `--foreground`, `--surface`, `--surface-muted`, `--border`, `--primary`, `--primary-hover`를 유지·확장한다.

필수 token:

- `--background`
- `--foreground`
- `--surface`
- `--surface-elevated`
- `--surface-muted`
- `--border`
- `--text-muted`
- `--primary`, `--primary-hover`, `--primary-soft`
- `--focus-ring`
- `--success-bg`, `--success-fg`, `--success-border`
- `--warning-bg`, `--warning-fg`, `--warning-border`
- `--error-bg`, `--error-fg`, `--error-border`
- `--info-bg`, `--info-fg`, `--info-border`
- `--code-bg`, `--code-fg`

색상 값은 구현 시 contrast를 측정해 확정한다. 목표는 WCAG 2.2 AA 기준으로 일반 텍스트 4.5:1 이상, 큰 텍스트·UI boundary 3:1 이상이다. disabled 상태는 의미 전달에 텍스트·속성도 함께 사용하며 색상 대비만으로 판단하지 않는다.

### 4.5 마이그레이션 전략

1. `globals.css` token과 theme bootstrap.
2. `ThemeToggle` 전용 Client Component와 Header 배치.
3. Header, ToolMenu, LanguageSwitcher, Footer, 공통 Button/TextInput/ResultPanel/CopyButton.
4. Home과 모든 tool route section.
5. 각 tool component의 card, input, result, status, code block, dropdown.
6. image/canvas/QR 등 실제 콘텐츠가 변형되지 않는지 확인.

단순 global CSS override로 모든 `.bg-white` 등을 강제로 덮지 않는다. specificity 충돌과 상태 색상 손상을 피하기 위해 semantic token class로 교체하거나 명시적 `dark:` variant를 적용한다. 공통 패턴은 primitive에 모으되 도구별 의미를 범용 component에 억지로 넣지 않는다.

### 4.6 파일 구조

```text
app/[locale]/layout.tsx                   # bootstrap, html hydration boundary
app/globals.css                           # theme tokens, dark variant, color-scheme
components/layout/theme-toggle.tsx        # 전역 toggle
components/layout/header.tsx              # toggle 배치
lib/theme.ts                              # key/value/type/resolve helper
messages/{ko,en,ja}.json                  # accessible labels
tests/dark-mode-browser.mjs               # 실제 Chrome 전역 QA
```

필요하면 `lib/theme.test.ts`를 추가한다. theme 관련 범용 dependency는 추가하지 않는다.

### 4.7 기존 구조와 충돌 검토

- Next.js App Router·SSG·next-intl·독립 URL 구조와 충돌 없음.
- locale과 무관한 theme storage key를 사용하므로 언어 변경에도 유지된다.
- 현재 전역 CSS 변수와 호환되지만 많은 `bg-white`, `text-slate-*`, `border-slate-*` 직접 사용을 전수 마이그레이션해야 한다.
- theme 선택은 SEO content·canonical·hreflang·sitemap을 바꾸지 않는다.
- JSON-LD inline script와 theme bootstrap script는 역할을 분리한다.
- Server Component를 불필요하게 Client Component로 전환하지 않는다. 상호작용은 `ThemeToggle`만 client boundary로 둔다.
- Architect 검토 결과: `APPROVED FOR BUILD`.

## 5. UI 디자인 계약

### Light palette 방향

- 현재 밝은 배경, 흰 surface, slate text, blue primary의 브랜드 인상을 유지한다.
- 기존 화면의 시각적 변화는 theme token 정리와 명백한 contrast 개선에 한정한다.

### Dark palette 방향

- background는 순수 검정이 아닌 매우 짙은 slate 계열을 사용한다.
- surface는 background보다 밝아 card 경계가 보이게 한다.
- 본문은 순백 대신 눈부심이 덜한 밝은 neutral을 사용한다.
- primary blue는 어두운 배경에서 link·button·focus가 구분되도록 조정한다.
- border가 사라지거나 모든 card가 같은 검정 덩어리로 합쳐지지 않게 한다.
- error=red, warning=amber, success=green, info=blue의 의미는 유지하되 dark 배경용 shade를 별도로 사용한다.

### Header 배치

- 데스크톱: ToolMenu와 LanguageSwitcher 구조를 유지하고 theme toggle을 LanguageSwitcher 왼쪽에 배치한다.
- 모바일: logo·Tools·theme·language가 320px에서 겹치지 않아야 한다. 필요하면 theme visible text와 brand text를 숨기되 control은 제거하지 않는다.
- ToolMenu dropdown은 열린 상태에서도 현재 theme surface·border·hover·active를 사용한다.

### 상태와 콘텐츠

- hover, focus, active, selected, disabled가 light/dark 양쪽에서 서로 구분되어야 한다.
- placeholder와 helper text는 본문보다 약하지만 읽을 수 있어야 한다.
- readonly result와 editable input의 차이가 색상만이 아니라 label·속성으로도 유지된다.
- QR의 기본 흰 배경, 이미지 preview, thumbnail, color swatch는 theme에 의해 변색되지 않는다.
- transparent image를 보여 주는 checkerboard는 dark에서도 투명 영역임을 구분할 수 있어야 한다.

## 6. 다국어 문구 계약

`Common.theme` 아래에 최소 다음 key를 추가한다.

| Key | ko | en | ja |
|---|---|---|---|
| `enableDark` | 다크 모드 켜기 | Enable dark mode | ダークモードをオン |
| `enableLight` | 라이트 모드 켜기 | Enable light mode | ライトモードをオン |

tooltip을 제공한다면 accessible name과 같은 의미를 사용한다. 화면에 “켜짐/꺼짐”만 표시해 무엇이 켜지는지 모호하게 만들지 않는다.

## 7. 개인정보·보안·성능

- localStorage에는 `light` 또는 `dark`만 저장한다.
- storage 값은 CSS class allowlist로 변환하고 임의 class·HTML로 사용하지 않는다.
- theme script는 network request, cookie, analytics를 수행하지 않는다.
- 외부 theme API 또는 CDN을 사용하지 않는다.
- bootstrap은 압축 전 기준 작고 동기적인 최소 코드여야 하며 layout 계산이나 DOM 탐색을 반복하지 않는다.
- theme 전환으로 페이지 reload, route navigation 또는 대규모 React re-render를 유발하지 않는다.
- 전역 color transition은 transform/layout property를 건드리지 않고 150~200ms 이하를 권장한다.
- `prefers-reduced-motion`에서는 transition을 끈다.

## 8. QA 필수 테스트

### 초기 결정과 영속성

1. 저장값 없음 + system light → 첫 paint light.
2. 저장값 없음 + system dark → 첫 paint dark.
3. 저장값 light + system dark → light 우선.
4. 저장값 dark + system light → dark 우선.
5. 잘못된 storage 값 → system fallback, crash·console error 0.
6. localStorage 접근이 예외를 던져도 light/system fallback.
7. toggle 후 `konly-theme`에 정확히 light/dark만 저장.
8. reload 후 유지.
9. 다른 도구 route 이동 후 유지.
10. locale ko→en→ja 변경 후 유지.
11. 명시적 저장값이 없을 때 system theme 변경 event 반영.
12. 명시적 저장값이 있으면 system theme 변경이 사용자 선택을 덮지 않음.

### Hydration과 깜빡임

13. light·dark 진입 모두 hydration error 0.
14. head bootstrap 실행 직후, React hydration 전 `html` class/data-theme가 기대값과 같음.
15. dark 저장 상태 reload의 초기 screenshot에서 밝은 full-page frame이 관찰되지 않음.
16. JavaScript disabled에서 system media query 기반으로 본문이 읽힘.

### 페이지·컴포넌트 매트릭스

light와 dark 각각 다음을 실제 Chrome으로 검사한다.

- Home
- Header, ToolMenu category·전체 menu, LanguageSwitcher, Footer
- Word Counter
- JSON Formatter
- Password Generator
- Base64 Converter
- URL Encoder / Decoder
- YouTube Thumbnail Downloader
- QR Code Generator
- IP Info
- Image Color Picker와 pixel magnifier
- Image Compressor
- Regex Tester
- Cron Expression Generator

각 페이지에서 default·hover/focus·input·result·success·warning·error·disabled 상태 중 존재하는 상태를 최소 한 번 만든다.

### 반응형과 접근성

17. viewport 320, 375, 768, 1024, 1440px.
18. header control 겹침 0, 가로 overflow 0, dropdown 화면 밖 잘림 0.
19. toggle target 44×44px 이상.
20. keyboard Tab → Enter/Space 전환 PASS, focus visible.
21. accessible name이 현재 동작과 일치하고 locale별 번역됨.
22. icon만으로 상태를 전달하지 않음.
23. 일반 text 4.5:1 이상, 큰 text·UI component 3:1 이상을 대표 token 조합별 자동 또는 수동 측정.
24. status가 색상만으로 전달되지 않음.
25. reduced motion에서 theme transition 비활성.

### 기능·시각 회귀

26. 모든 기존 unit/component test PASS.
27. 각 도구의 핵심 browser QA PASS.
28. QR·업로드 이미지·thumbnail·color swatch의 pixel 색상이 theme 전환 전후 동일.
29. input caret, selection, placeholder, native select option이 읽힘.
30. code/pre 긴 문자열이 layout을 깨뜨리지 않음.
31. Console Error 0, page error 0, hydration error 0.
32. theme 동작으로 network request 0.
33. production build, metadata, canonical, hreflang, sitemap 회귀 PASS.

## 9. Critic 필수 질문

Critic은 화면 평가 전에 최소 다음 질문을 확정하고 답·증거·점수를 기록한다.

1. 사용자가 toggle의 용도와 현재 가능한 동작을 즉시 이해하는가?
2. 첫 방문에서 운영체제 선호가 정확히 반영되는가?
3. 사용자의 명시적 선택이 system preference보다 우선하는가?
4. reload·route·locale 변경에도 테마가 유지되는가?
5. 첫 paint에서 반대 테마가 번쩍이지 않는가?
6. Header가 320px에서도 과밀하거나 겹치지 않는가?
7. background와 surface 계층이 dark에서도 구분되는가?
8. 본문·muted text·placeholder·disabled text가 읽히는가?
9. hover·focus·selected 상태가 양쪽 테마에서 명확한가?
10. error·warning·success·info가 과도하게 밝거나 흐리지 않은가?
11. 모든 기존 도구에서 밝은 card나 어두운 text가 잘못 남지 않았는가?
12. 이미지·QR·canvas·색상 swatch가 변형되지 않는가?
13. keyboard와 screen reader 사용자가 toggle 상태·동작을 이해하는가?
14. 애니메이션이 불편한 사용자의 reduced-motion 설정을 존중하는가?
15. theme 선택으로 사용자 정보가 서버에 전송되지 않는가?
16. dark mode 때문에 기존 기능·SEO·성능이 퇴행하지 않는가?

## 10. 완료 게이트

다음 조건을 모두 충족할 때만 Product Owner가 `DONE`을 기록한다.

- Critic 평가 90/100 이상
- Critical Issue 0, High Issue 0
- TypeScript 오류 0, lint 오류·경고 0
- 전체 자동 테스트 fail·skip·todo 0
- light/dark 실제 Chrome QA PASS
- 12개 기존 도구와 Home의 양쪽 theme 시각·기능 회귀 PASS
- theme 초기화·저장·reload·route·locale·system preference 테스트 PASS
- hydration error·Console Error·page error 0
- 320/375/768/1024/1440px 반응형 PASS
- 대표 text·UI contrast WCAG AA PASS
- 사용자 image/QR/canvas/swatch pixel 불변 PASS
- theme 관련 network request 0
- 기존 SEO·menu·sitemap 회귀 PASS
- 개선 반복 최대 5회

5회 개선 후에도 하나라도 충족하지 못하면 억지로 PASS하지 않고 `NEEDS HUMAN REVIEW`로 기록한다.

## 11. Architect 검토 결론

- 결과: `APPROVED FOR BUILD`
- 신규 dependency·서버 API·cookie는 필요 없다.
- 현재 App Router, next-intl, Tailwind CSS 4 구조와 충돌하지 않는다.
- 구현 난이도의 핵심은 toggle 자체가 아니라 직접 지정된 색상을 의미 기반 token으로 안전하게 전환하고 12개 도구의 모든 상태를 재검증하는 작업이다.
- 가장 큰 위험은 초기 theme flash/hydration mismatch, dark에서 남는 light-only surface, 상태 색상 대비 저하, 사용자 image/canvas 변형이다.
- 대응은 pre-hydration bootstrap, selector 기반 dark theme, 공통 primitive 우선 마이그레이션, 전체 실제 Chrome matrix다.
- Builder 인계 상태: `COMPLETED` (Builder 자체 최종 승인 아님)
- 최종 판정: Critic 98/100, Critical 0, High 0, 자동 테스트·브라우저 QA·Console Error 0 조건을 충족하여 Product Owner `DONE`.
