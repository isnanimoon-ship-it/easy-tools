# Markdown 뷰어 SPEC

## 문서 상태

- 기능명: Markdown Viewer / Markdown 뷰어
- 상태: `DONE`
- 작성일: 2026-09-12
- 예정 URL: `/{locale}/tools/markdown-viewer`
- 지원 locale: `ko`, `en`, `ja`
- 카테고리: 텍스트
- 유일한 구현 기준: 이 문서
- 구현 상태: 구현 및 Critic·QA 재검증 완료

## 1. 문제 정의

사용자는 README, 메모, 문서 초안 등의 Markdown을 별도 프로그램 없이 붙여 넣거나 파일로 열어 실제 표시 결과를 확인하고 싶다. 원문과 미리보기를 쉽게 비교할 수 있어야 하며, 악성 HTML·링크·외부 이미지 때문에 코드가 실행되거나 의도하지 않은 네트워크 요청이 발생해서는 안 된다.

이 도구는 Markdown 작성·검토용 읽기 화면을 제공한다. 협업 편집기, 파일 호스팅 서비스 또는 완전한 GitHub 미리보기 복제본을 목표로 하지 않는다.

## 2. 대상 사용자

- README나 기술 문서를 게시하기 전에 모양을 확인하려는 사용자
- Markdown 파일을 설치 없이 읽으려는 사용자
- 제목, 목록, 표, 코드 블록과 링크 구조를 빠르게 검토하려는 개발자·작성자
- 민감할 수 있는 문서를 서버에 업로드하지 않고 확인하려는 사용자
- 모바일에서 간단한 Markdown 문서를 열어보려는 사용자

## 3. Product Owner 범위 결정

### Must Have — V1

- Markdown 직접 입력 및 붙여넣기
- `.md`, `.markdown`, `.txt` UTF-8 텍스트 파일 선택 및 Drag & Drop
- 원문 수정 시 debounce 후 미리보기 갱신
- `분할 보기`, `원문`, `미리보기` 모드 전환
- 제목, 문단, 굵게, 기울임, 취소선, 인라인 코드
- 순서/비순서 목록, 중첩 목록, 인용문, 구분선
- fenced code block과 언어명 표시
- 링크
- GitHub Flavored Markdown의 표, task list, 취소선, 자동 링크
- 입력 예제 불러오기
- 초기화
- 빈 입력 정상 처리
- 잘못되거나 불완전한 Markdown에서도 앱이 중단되지 않음
- 원문과 렌더 결과를 명확히 구분
- 브라우저 로컬 처리 및 비저장 안내
- raw HTML 실행 차단
- 위험한 URL protocol 차단
- 외부 이미지 자동 요청 차단
- ko/en/ja UI, metadata, Breadcrumb, 홈·메뉴·sitemap 등록
- 기존 공통 상세 콘텐츠 디자인과 light/dark theme 사용
- 모바일, 키보드와 스크린리더 대응

### Should Have — V1 안정화 후 별도 승인

- 사용자가 위험 안내를 확인한 경우에만 원격 이미지 불러오기
- heading 목차와 문서 내 이동
- 미리보기의 코드 블록 복사
- 원문 검색
- 로컬 상대 이미지와 함께 여는 문서 묶음

### Could Have — 별도 SPEC

- 구문 강조
- 미리보기 인쇄
- 안전하게 정제한 HTML 내보내기
- Mermaid, 수식, 각주, front matter 표시
- 편집 내용 자동 저장 또는 공유 링크
- 여러 Markdown 파일 탭

### Do Not Build — V1

- raw HTML 렌더링 또는 script 실행
- Markdown 안의 iframe, object, embed, form, style 실행
- `javascript:`, `data:text/html`, `vbscript:` 링크
- 외부 URL의 Markdown 자동 가져오기
- 원격 이미지·tracking pixel 자동 로드
- 서버 업로드, 데이터베이스, 로그인, 최근 문서 기록
- WYSIWYG 편집기
- GitHub와 픽셀 단위로 동일하다는 보장
- Markdown을 PDF, DOCX, HWP로 변환

## 4. 입력 계약

### 4.1 직접 입력

- textarea에 일반 Unicode 문자열을 입력한다.
- 한글, 영어, 일본어, Emoji, 여러 줄 입력을 손실 없이 유지한다.
- 입력한 공백과 줄바꿈을 원문 영역에서 임의로 정규화하지 않는다.
- 빈 문자열과 공백만 있는 문자열은 오류가 아니다. 미리보기는 빈 상태 안내를 표시한다.

### 4.2 파일 입력

- 확장자 `.md`, `.markdown`, `.txt`만 허용한다.
- V1 파일 인코딩은 UTF-8과 UTF-8 BOM만 지원한다.
- 잘못된 UTF-8 byte sequence는 대체문자로 조용히 손실시키지 않고 이해하기 쉬운 오류로 처리한다.
- 파일 크기 제한은 2 MiB다. 제한 검사는 `arrayBuffer()` 또는 `text()` 호출 전에 `File.size`로 수행한다.
- binary 파일, NUL 문자가 포함된 입력과 확장자 위장 파일은 오류 처리한다.
- 파일을 열면 기존 입력을 교체한다. 기존 입력이 있으면 교체 사실을 사용자가 알 수 있어야 한다.
- 파일명은 화면 표시 외에 URL, storage, analytics 또는 console에 기록하지 않는다.

## 5. Markdown 렌더링 규칙

### 5.1 기본 문법

- CommonMark 호환 기본 문법을 사용한다.
- GFM 확장 중 표, task list, 취소선, 자동 링크를 지원한다.
- heading은 `h1`~`h6` 의미를 유지하되, 페이지 자체의 H1과 시각적 위계가 혼동되지 않도록 preview 컨테이너 안에서 스타일링한다.
- soft line break는 CommonMark 기본 규칙을 따른다. 모든 단일 줄바꿈을 `<br>`로 강제하지 않는다.
- code block은 코드를 실행하지 않고 텍스트로만 표시한다.
- language fence는 class 또는 화면 label에 안전한 문자열로 반영할 수 있지만 동적 코드를 실행하지 않는다.
- task list checkbox는 읽기 전용이다. 클릭해 원문을 변경하지 않는다.

### 5.2 링크

- 허용 protocol은 `http:`, `https:`, `mailto:`다.
- 상대 링크와 fragment 링크는 표시할 수 있다. 파일 기반 문서에는 기준 URL이 없으므로 상대 링크가 현재 사이트 경로로 잘못 이동하지 않도록 클릭을 막고 대상 문자열을 안내한다.
- 외부 링크는 새 탭으로 열며 `rel="noopener noreferrer nofollow"`를 적용한다.
- 링크 label과 URL은 텍스트로 안전하게 렌더링하며 HTML attribute를 직접 조합하지 않는다.
- 허용하지 않는 protocol은 링크 기능을 제거하고 일반 텍스트 또는 비활성 링크로 표시한다.

### 5.3 이미지

- V1에서는 이미지 Markdown 문법을 인식하되 원격·상대·data/blob 이미지를 자동으로 요청하거나 렌더링하지 않는다.
- 미리보기에는 alt text와 `외부 이미지는 자동으로 불러오지 않습니다` 안내가 포함된 placeholder를 표시한다.
- 이미지 URL 전체가 지나치게 길 경우 화면 layout을 깨뜨리지 않도록 줄바꿈한다.
- 추후 원격 이미지 opt-in을 추가하려면 IP·Referer·쿠키 노출 가능성을 확인하는 별도 승인 단계가 필요하다.

### 5.4 HTML과 보안

- Markdown 원문의 raw HTML은 DOM 요소로 해석하지 않는다. 화면에는 HTML 문자 그대로 보이거나 렌더 결과에서 제외한다.
- renderer에서 생성되는 React element만 사용하고 사용자 입력을 `dangerouslySetInnerHTML`에 전달하지 않는다.
- SVG, MathML, event handler, inline style과 `srcdoc`을 사용자 입력에서 생성하지 않는다.
- sanitize를 renderer 안전성 주장만으로 생략하지 않는다. URL transform과 component allowlist를 별도로 적용한다.
- malformed Markdown, 매우 깊은 중첩, 긴 단일 줄과 긴 URL이 화면 또는 parser를 중단시키지 않아야 한다.

## 6. 화면과 상호작용

### 6.1 기본 순서

1. 공통 `ToolPageHero`와 Breadcrumb
2. 브라우저 처리·HTML/외부 이미지 차단 안내
3. 파일 열기, 예제, 초기화 action
4. 보기 모드 전환
5. 원문과 미리보기
6. 공통 `ToolDetailContent`

### 6.2 보기 모드

- 기본값은 넓은 화면에서 `분할 보기`, 767px 이하에서 `원문` 또는 `미리보기` 단일 탭이다.
- 모바일에서 사용자가 선택한 탭을 유지하되 브라우저 storage에는 저장하지 않는다.
- 분할 보기에서는 원문과 미리보기 폭을 동일하게 시작한다. V1에는 draggable divider를 넣지 않는다.
- 원문 textarea와 미리보기에는 각각 보이는 label을 제공한다.
- 미리보기 컨테이너는 충분한 최소 높이와 내부 세로 스크롤을 제공한다.
- 긴 code line은 code block 내부에서 가로 스크롤되며 페이지 전체를 밀어내지 않는다.
- 긴 표는 preview 내부에서 가로 스크롤되며 페이지 전체 overflow를 만들지 않는다.

### 6.3 실시간 갱신

- 입력 변경 후 200~300ms debounce해 렌더한다. Architect 기본값은 250ms다.
- 최신 입력만 화면에 반영하며 이전 비동기 결과가 최신 결과를 덮지 않는다.
- 2 MiB에 가까운 입력에서도 키 입력이 지속적으로 멈추는 경우 Worker 또는 더 낮은 파일 한도를 재검토한다.
- 로딩이 체감되는 경우 `미리보기를 업데이트하는 중` 상태를 `aria-live`로 알린다.

### 6.4 예제와 초기화

- 예제는 제목, 목록, task list, 표, 인용문, 링크, code block을 한 번씩 보여주는 짧은 문서다.
- 예제는 실제 서비스·광고 문구나 외부 이미지를 포함하지 않는다.
- 초기화는 입력, 파일명, 보기 상태, 오류와 임시 렌더 결과를 제거한다.
- 초기화 후 빈 상태는 오류 메시지를 표시하지 않는다.

## 7. 오류 처리

사용자에게 라이브러리 예외 원문이나 stack trace를 노출하지 않는다.

| 상황 | 사용자 메시지 의미 | 복구 |
|---|---|---|
| 지원하지 않는 확장자 | Markdown 또는 텍스트 파일만 열 수 있음 | 다른 파일 선택 |
| 2 MiB 초과 | 파일 제한을 명시 | 더 작은 파일 선택 |
| 잘못된 UTF-8/binary | 텍스트 Markdown으로 읽을 수 없음 | UTF-8로 저장 후 재시도 |
| 파일 읽기 실패 | 브라우저가 파일을 읽지 못함 | 다시 선택 |
| 렌더러 실패 | 미리보기를 만들지 못함 | 원문 유지, 수정·초기화 가능 |

불완전한 Markdown 문법은 일반적으로 오류가 아니다. parser가 해석 가능한 범위에서 텍스트로 표시한다.

## 8. 개인정보와 데이터 처리

- Markdown 원문과 선택 파일은 현재 탭의 브라우저 메모리에서만 처리한다.
- 원문, 렌더 결과, 파일명과 검색·편집 내용은 서버로 전송하지 않는다.
- localStorage, sessionStorage, IndexedDB, cookie, URL query/hash와 history에 문서 내용을 저장하지 않는다.
- analytics에는 도구 경로 방문 정도만 허용하며 문서 내용, 파일명, 크기와 오류 원문을 포함하지 않는다.
- 초기화와 unmount 때 파일 buffer와 렌더 상태 참조를 해제한다.
- 외부 이미지가 자동 차단된다는 사실과 외부 링크 클릭 시 해당 사이트로 이동한다는 사실을 구분해 안내한다.

## 9. 접근성

- textarea, 파일 입력, 보기 모드, 예제와 초기화에 명확한 label 또는 accessible name을 제공한다.
- 모드 전환은 tab 또는 radio semantics 중 하나를 일관되게 사용하고 키보드로 조작할 수 있어야 한다.
- preview는 `aria-label` 또는 heading으로 영역 목적을 알린다.
- 렌더된 heading, list, table, blockquote, code의 native semantics를 유지한다.
- task checkbox는 읽기 전용임을 disabled 또는 `aria-disabled`로 전달한다.
- 오류는 `role="alert"`, 갱신 상태는 적절한 `aria-live`로 제공한다.
- focus indicator와 색상 대비는 기존 theme token을 사용한다.
- 링크 상태와 이미지 차단 상태를 색상만으로 표현하지 않는다.

## 10. 반응형 기준

- 필수 폭: 320, 375, 768, 1024, 1440px
- 320/375px에서는 원문과 미리보기를 동시에 좁게 배치하지 않고 탭으로 전환한다.
- 파일 action과 모드 button은 줄바꿈되어도 겹치거나 잘리지 않는다.
- preview의 표와 code block만 내부 가로 스크롤을 허용한다.
- heading, 긴 URL, 긴 영문 단어로 페이지 전체 가로 스크롤이 생기지 않는다.
- 모바일 가상 키보드가 열린 상태에서도 원문 입력과 모드 전환이 가능해야 한다.

## 11. 콘텐츠와 SEO

- 제목: `Markdown 뷰어`
- 설명은 Markdown 붙여넣기·파일 열기·브라우저 미리보기·서버 비전송을 자연스럽게 설명한다.
- 상세 콘텐츠는 공통 구조를 사용하고 다음을 포함한다.
  - Markdown 뷰어가 하는 일
  - 사용 방법
  - 제목·목록·표·code block 예시
  - CommonMark와 GFM 지원 범위
  - raw HTML과 외부 이미지 제한
  - 브라우저 처리와 저장하지 않는 데이터
  - FAQ 3~5개
  - 관련 도구 3~5개와 다른 인기 도구
- 관련 도구 후보: 텍스트 정리기, 글자수 계산기, 정규식 테스터, JSON 포맷터
- 독립 metadata, canonical, ko/en/ja hreflang, BreadcrumbList를 기존 helper로 생성한다.
- registry 등록으로 홈, 상단 메뉴, sitemap과 인기 도구 집계 대상이 자동 갱신되어야 한다.
- FAQPage JSON-LD는 현재 사이트 정책과 Google 적합성을 별도로 충족하지 않으면 추가하지 않는다.

## 12. 라이브러리 검토와 Architect 결정

### 후보

| 후보 | 장점 | 주의점 | 결정 |
|---|---|---|---|
| `react-markdown` + `remark-gfm` | Markdown AST를 React element로 렌더하고 component override가 쉬움, raw HTML을 기본 실행하지 않음 | URL·이미지 정책과 component allowlist를 별도로 구현해야 함 | **선택** |
| `marked` | 빠르고 API가 단순하며 문자열 HTML 생성에 적합 | 생성 HTML을 DOM에 넣기 전 별도 sanitizer가 필수이고 React 구조 제어가 간접적 | 보류 |
| `markdown-it` | 확장성과 설정 범위가 넓음 | HTML 문자열 기반이며 현재 범위에는 plugin·sanitize 설계가 과함 | 보류 |
| 직접 parser 구현 | dependency 없음 | CommonMark/GFM 정확성·보안·유지보수 비용이 큼 | 제외 |

### 선택 조건

- `react-markdown`과 `remark-gfm`의 구현 시점 최신 안정 버전을 공식 저장소와 npm metadata에서 다시 확인하고 정확한 버전으로 lock한다.
- 두 package의 license를 설치 후 package 파일에서 확인해 `THIRD_PARTY_NOTICES.md`에 기록한다.
- `rehype-raw`는 설치하거나 사용하지 않는다.
- 사용자 입력을 `dangerouslySetInnerHTML`에 넣지 않는다.
- `<img>` component는 자동 네트워크 요청을 하지 않는 placeholder로 교체한다.
- `<a>` component는 허용 protocol, 상대 URL과 fragment를 검증한다.
- 번들 영향은 해당 도구 route의 client chunk에서 확인한다. 렌더러는 다른 도구의 초기 bundle에 포함하지 않는다.

공식 프로젝트 기준 참고:

- react-markdown: https://github.com/remarkjs/react-markdown
- remark-gfm: https://github.com/remarkjs/remark-gfm
- marked 보안 안내: https://github.com/markedjs/marked
- markdown-it: https://github.com/markdown-it/markdown-it

## 13. 구현 구조 제안

- `app/[locale]/tools/markdown-viewer/page.tsx`: metadata, 공통 Hero와 상세 콘텐츠 조립
- `components/tools/markdown-viewer/markdown-viewer.tsx`: 상태·파일·보기 모드 UI
- `components/tools/markdown-viewer/markdown-preview.tsx`: renderer component allowlist와 URL/image 정책
- `lib/tools/markdown-viewer/file-validation.ts`: 크기·확장자·UTF-8·binary 검증
- `lib/tools/markdown-viewer/url-policy.ts`: 링크 protocol과 상대 링크 정책
- `lib/tools/detail-content-data.ts`: 도구별 설명, FAQ
- `lib/tools/registry.ts`, `messages/{ko,en,ja}.json`: 등록과 번역

기존 `ToolPageHero`, `ToolDetailContent`, `Container`, Breadcrumb router, registry, metadata helper와 theme token을 재사용한다. 다른 도구나 전체 layout은 리팩터링하지 않는다.

## 14. QA 필수 테스트

### 문법

1. 일반 문단과 여러 줄
2. H1~H6
3. 굵게, 기울임, 취소선, inline code
4. 순서/비순서/중첩 목록
5. 인용문과 구분선
6. fenced code block 및 language fence
7. GFM 표
8. task list
9. 자동 링크와 일반 링크
10. 한글, 영어, 일본어, Emoji
11. 빈 문자열과 공백만 있는 입력
12. 닫히지 않은 강조·링크·code fence
13. 매우 긴 단일 줄, URL, 표와 code line

### 파일

14. `.md`, `.markdown`, `.txt` UTF-8
15. UTF-8 BOM
16. 잘못된 UTF-8
17. binary/NUL 파일
18. 지원하지 않는 확장자
19. 0 byte
20. 2 MiB 경계와 초과
21. 같은 파일 재선택과 다른 파일 교체
22. Drag & Drop

### 보안

23. `<script>`, event handler, iframe, style, SVG가 실행·삽입되지 않음
24. `javascript:`, `data:text/html`, `vbscript:` 링크가 작동하지 않음
25. 원격·상대·data 이미지 request 0
26. 외부 HTTPS 링크에 `noopener noreferrer nofollow`
27. 문서 marker가 network, storage, URL, console, analytics에 포함되지 않음
28. parser error 원문과 stack trace가 UI·console에 노출되지 않음

### UX·접근성·회귀

29. 분할/원문/미리보기 전환과 250ms debounce
30. 예제 불러오기와 초기화
31. keyboard-only 전체 흐름과 focus indicator
32. heading/list/table/code/task checkbox semantics
33. 오류 alert와 갱신 live region
34. 320/375/768/1024/1440px overflow·겹침 0
35. light/dark theme
36. ko/en/ja 직접 URL, 문구, metadata, Breadcrumb
37. registry, 메뉴, 홈, sitemap, 인기 도구 집계 연결
38. Console Error와 unhandled rejection 0

## 15. 수용 기준

1. 사용자가 입력하거나 연 UTF-8 Markdown이 원문 손실 없이 미리보기에 반영된다.
2. CommonMark 기본 요소와 지정한 GFM 요소가 fixture 기대 DOM과 일치한다.
3. 빈 입력은 오류 없이 빈 상태로 유지된다.
4. 불완전한 Markdown에서도 앱이 깨지지 않고 원문을 계속 수정할 수 있다.
5. raw HTML과 위험 URL이 실행 가능한 DOM으로 만들어지지 않는다.
6. 이미지 문법만으로 외부 network request가 발생하지 않는다.
7. 파일 제한과 UTF-8/binary 검사가 파싱 전에 작동한다.
8. 원문·파일명·렌더 결과가 서버, storage, URL, console, analytics로 유출되지 않는다.
9. 320~1440px에서 전체 페이지 가로 overflow와 control overlap이 없다.
10. 키보드와 스크린리더가 원문, 모드, 미리보기와 오류 상태를 구분할 수 있다.
11. ko/en/ja에서 기능과 보안 안내의 의미가 일치한다.
12. 기존 도구 기능, 공통 navigation과 dark theme에 회귀가 없다.

## 16. Critic 필수 질문

1. 처음 방문한 사용자가 입력과 미리보기 영역을 즉시 구분하는가?
2. 파일을 열거나 붙여넣은 뒤 별도 설명 없이 미리보기를 확인할 수 있는가?
3. 빈 입력과 잘못된 파일의 상태가 혼동되지 않는가?
4. 지원하는 CommonMark/GFM 범위와 GitHub의 차이를 과장 없이 이해할 수 있는가?
5. raw HTML과 이미지가 표시되지 않는 이유를 오류로 오해하지 않는가?
6. 링크를 클릭하기 전에 외부 이동임을 이해할 수 있는가?
7. 긴 문서·표·code block이 모바일 layout을 깨뜨리지 않는가?
8. 키보드와 스크린리더만으로 모드 전환과 파일 교체가 가능한가?
9. 느린 렌더·파일 오류에서 원문을 잃지 않고 복구 가능한가?
10. ko/en/ja의 보안·개인정보 안내 의미가 동일한가?
11. 문서가 서버로 전송되지 않는 설명과 실제 network 동작이 일치하는가?
12. 초기화 후 다른 문서를 반복해서 열기 쉬운가?

## 17. 완료 조건

- Architect 라이브러리·보안 설계 승인
- lint, type-check, 전체 자동 테스트, production build PASS
- Critic 점수 90/100 이상
- Critical 0, High 0
- CommonMark/GFM 지정 fixture PASS
- raw HTML·위험 URL·외부 이미지 보안 테스트 PASS
- 파일 검증과 개인정보 비전송 PASS
- Console Error와 unhandled rejection 0
- 320/375/768/1024/1440px 모바일·반응형 PASS
- ko/en/ja, metadata, Breadcrumb, registry, sitemap PASS
- `docs/EVALUATION.md`의 모든 PASS 게이트 충족

Builder는 구현 완료 여부를 스스로 승인하지 않는다. Critic → QA → Optimizer → Critic+QA 재검증을 따르며 최대 5회 개선한다. 5회 이후에도 하나라도 미달하면 `NEEDS HUMAN REVIEW`로 기록한다.

## 18. Architect 검토 결과

### 승인 사항

- App Router의 기존 `/{locale}/tools/{slug}` 구조와 `text` 카테고리를 그대로 사용한다.
- HWP 뷰어처럼 페이지 설명을 직접 구현하지 않고 처음부터 공통 `ToolPageHero`와 `ToolDetailContent`를 사용한다.
- Markdown parser를 직접 만들지 않고 `react-markdown` + `remark-gfm`을 route 전용 client component에서 사용한다.
- raw HTML은 지원하지 않으며 `rehype-raw`도 사용하지 않는다.
- 외부 이미지는 V1에서 자동 로드하지 않는다. 이 결정은 개인정보 보호와 tracking request 방지가 표시 완전성보다 우선한다.
- 미리보기는 React element로 렌더하며 사용자 Markdown을 HTML 문자열로 DOM에 삽입하지 않는다.
- 파일은 UTF-8과 2 MiB로 제한해 인코딩 추정과 메인 스레드 장기 정지를 피한다.
- Markdown 전용 색상 체계를 만들지 않고 기존 prose에 맞는 theme token을 사용한다.

### 구현 전 재확인 조건

1. 설치 시점의 정확한 package version, license, dependency tree와 audit 결과를 기록한다.
2. Next.js 16.3.3의 client component 및 lazy-loading 관련 로컬 문서를 다시 확인한다.
3. `react-markdown`의 최신 공식 보안 안내와 URL transform 기본 동작을 설치된 소스에서 확인한다.
4. renderer client chunk가 다른 도구 route 초기 bundle에 포함되지 않는지 production build로 확인한다.
5. image override보다 URL 해석이나 preload가 먼저 일어나지 않는지 실제 browser network test로 증명한다.

### Architect 결론

범위, 보안 정책, 데이터 흐름과 재사용 구조는 구현 가능한 수준으로 확정됐다. 본 SPEC은 구현 시작이 가능하지만 아직 코드 구현이나 품질 PASS를 의미하지 않는다.
