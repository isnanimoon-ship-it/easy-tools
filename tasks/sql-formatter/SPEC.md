# SQL Formatter / SQL Beautifier SPEC

## 문서 상태

- 기능명: SQL Formatter / SQL Beautifier
- 상태: `SPEC READY — Architect 검토 완료, Builder 착수 전`
- 우선순위: IDEAS.md 개선 회차와 별도로 신규 편성된 기능 / P0
- Product Owner 승인일: 2026-08-30
- 개선 회차: 최초 구현 전
- 예정 URL: `/{locale}/tools/sql-formatter`
- 지원 locale: `ko`, `en`, `ja`
- 유일한 구현 기준: 이 문서

## 1. 문제 정의

사용자가 가독성이 낮은 SQL 쿼리(한 줄로 이어지거나 들여쓰기가 없는 SELECT/JOIN/CTE/DDL 등)를 입력하면, 선택한 DBMS 문법을 고려해 읽기 쉬운 형태로 자동 정렬한다. SQL에는 실제 서비스의 테이블·컬럼·비즈니스 로직이 노출될 수 있으므로 입력을 서버로 전송하지 않고 브라우저에서만 처리해야 하며, 무엇보다 포매팅 전후로 SQL의 실행 의미가 절대 바뀌면 안 된다.

## 2. 대상 사용자

- 코드 리뷰·문서화를 위해 SQL을 정리해야 하는 백엔드/데이터 개발자
- Slack, 티켓, 위키에 붙여넣기 전 SQL을 다듬는 DBA·데이터 분석가
- 여러 DBMS(MySQL, PostgreSQL, SQL Server, Oracle, SQLite)를 오가며 작업하는 개발자
- 회사 SQL을 외부 서버로 보내고 싶지 않은 보안 민감 조직의 사용자

## 3. 가치 제안

사용자가 DBMS를 선택하고 SQL을 붙여넣으면, 해당 방언의 주요 문법을 깨뜨리지 않으면서 일관된 들여쓰기·키워드 대소문자·줄바꿈 규칙으로 정렬된 결과를 얻는다. 브라우저 밖으로 SQL이 나가지 않으므로 실제 테이블·컬럼명이 포함된 쿼리도 안전하게 다룰 수 있다.

## 4. 우선순위와 범위

### Must Have

- SQL 입력(textarea)과 DBMS 선택
- Format(정렬), Copy, Clear
- Keyword Case 선택(UPPERCASE/lowercase/Preserve, 기본 UPPERCASE)
- Indent 설정(2 spaces/4 spaces/Tab, 기본 4 spaces)
- Multi statement(세미콜론으로 구분된 여러 SQL 문) 정렬
- Comment(`--`, `/* */`) 보존 — 삭제하지 않고 위치가 크게 어긋나지 않게 유지
- SQL 구문 오류를 파싱 실패 시점에 사용자 친화적으로 표시(단, "완전한 DB 검증기"로 표현하지 않음)
- 지원 DBMS: Generic SQL, MySQL, PostgreSQL, SQL Server(T-SQL), Oracle(PL/SQL 서브셋), SQLite — 기본값 Generic SQL
- 개인정보 안내: "입력한 SQL은 브라우저에서 처리됩니다."
- `ko`, `en`, `ja`, 모바일, 독립 URL·SEO·홈/공통 메뉴 등록

### Should Have — 이번 SPEC 범위에 포함하되 Builder 재검토 가능

- Minify(한 줄/최소 공백으로 축소, 문자열 리터럴 내부 공백은 보존)
- Comma Style(Trailing/Leading, 기본 Trailing) — **주의**: 6.4절 Architect 위험 참조. 선택한 라이브러리는 이 옵션을 네이티브로 지원하지 않으므로 자체 후처리로 구현해야 하며, 문자열·주석 안전성을 충분히 검증하지 못하면 Should Have에서 Could Have로 재분류하고 다음 SPEC 개정에서 다룬다.
- Example SQL(DBMS별 샘플 쿼리 버튼)
- Input/Output Swap(정렬 결과를 다시 입력으로 되돌려 반복 정렬)
- Logical Operator(AND/OR) 줄바꿈 방식
- Download(`formatted.sql` 파일 다운로드)

### Could Have — 이번 버전 제외, IDEAS.md 후속 검토

- SQL AST 시각화
- SQL lint(스타일 규칙 위반 감지)
- SQL EXPLAIN 도우미
- SQL 키워드 문서/툴팁
- SQL dialect 자동 변환기(예: MySQL `LIMIT` → SQL Server `TOP` 자동 치환)
- Format Preview(변경 전/후 diff 비교 뷰) — MVP는 입력/결과 2단 구성으로 충분

### Do Not Build in V1

- 실제 Database 연결
- Query 실행
- SQL을 다른 DBMS 문법으로 자동 변환
- Query 최적화 자동 수정
- DB 접속 정보(credential) 입력
- 완전한 SQL 문법 검증기로서의 보장

### 제외 범위

- Stored Procedure/Trigger 본문의 완전한 정렬(선택 라이브러리가 지원하지 않음, 6.2절 참조)
- MySQL `DELIMITER` 변경 처리
- PL/SQL 전체 블록(`BEGIN ... END;` 절차형 코드) 완전 지원 — SQL 문 단위 정렬만 보장하고, 지원 범위를 UI에 명확히 안내

후속 항목은 승인 없이 구현하지 않고 필요하면 `IDEAS.md`에서 별도로 관리한다.

## 5. DBMS(Dialect) 지원과 기본값

| UI 표시명 | 내부 dialect 식별자(6.1절 라이브러리 기준) | 기본값 여부 |
|---|---|---|
| Generic SQL | `sql` | 기본값 |
| MySQL | `mysql` | |
| PostgreSQL | `postgresql` | |
| SQL Server (T-SQL) | `tsql` | |
| Oracle (PL/SQL) | `plsql` | |
| SQLite | `sqlite` | |

- 기본값은 Product Owner 결정에 따라 **Generic SQL**로 한다. 특정 DBMS 문법(예: `TOP`, `ROWNUM`, backtick identifier)에 의존하지 않는 표준 SQL 입력이 가장 넓은 사용자층에 안전하기 때문이다.
- UI에 노출하는 DBMS 목록은 6.1절 라이브러리가 실제로 지원을 검증한 6개로 제한한다. 라이브러리가 나열하는 다른 dialect(BigQuery, Snowflake, Redshift 등)는 QA 대상이 아니므로 이번 버전 UI에 추가하지 않는다.

## 6. Architect 결정 1 — 포매팅 라이브러리 선정

### 6.1 결론: `sql-formatter` (npm, MIT License) 채택

- 패키지: [`sql-formatter`](https://github.com/sql-formatter-org/sql-formatter), 유지보수 조직 `sql-formatter-org`, MIT 라이선스, 순수 TypeScript, Node/브라우저 양쪽에서 동작하는 tree-shakeable ESM/CJS 빌드 제공.
- 채택 근거: 이 프로젝트가 요구하는 6개 dialect(`sql`, `mysql`, `postgresql`, `tsql`, `plsql`, `sqlite`)를 **모두 네이티브로 지원**하는 사실상 유일한 유지보수 중인 오픈소스 라이브러리다. GitHub 3,182+ commits, 2.9k+ stars로 채택 이력이 검증되었다.
- **아키텍처가 요구사항과 일치**: 이 라이브러리는 완전한 의미 분석 AST가 아니라 **토크나이저 기반 whitespace formatter**다("A whitespace formatter for different query languages"). 즉 SQL을 실행 가능한 형태로 재해석하지 않고 토큰 단위로 줄바꿈·들여쓰기만 조정하므로, "포매팅 때문에 SQL 의미가 바뀌면 안 된다"는 4절 핵심 원칙과 구조적으로 부합한다.
- **Placeholder 안전성**: `format()`에 `params`/`paramTypes` 옵션을 전달하지 않으면 `?`, `$1`, `:username`, `@userId` 등 각 dialect의 내장 prepared-statement placeholder는 값 치환 없이 토큰 그대로 출력에 남는다. 이 프로젝트는 **`params` 옵션을 절대 사용하지 않는다** — Builder는 이 제약을 코드 리뷰 체크리스트에 포함한다.
- **주석 보존**: `--`, `/* */` 주석은 토큰으로 취급되어 삭제되지 않는다. `/* sql-formatter-disable */` ~ `/* sql-formatter-enable */` 사이 구간은 formatter가 아예 건드리지 않는 pass-through 모드도 제공하므로, 포매터가 오작동할 위험이 있는 구간을 사용자가 직접 보호할 수 있다(Could Have로 UI 노출 검토, 이번 버전은 자동 동작만 사용).

### 6.2 알려진 제약(제외 범위·오류 처리에 반영됨)

- Stored Procedure/Trigger 본문, MySQL `DELIMITER $$ ... $$` 변경은 지원하지 않는다.
- 완전한 SQL 문법 검증기가 아니다 — 파싱에 실패하면 오류를 던지지만, 이는 "이 라이브러리의 토크나이저가 이해하지 못했다"는 의미이지 "DB 엔진이 이 SQL을 거부한다"는 뜻이 아니다. UI 문구는 반드시 이 차이를 반영한다(12절).
- 2026년 기준 유지보수 상태가 "maintenance mode"(버그 수정 위주, 신규 기능 추가는 낮은 우선순위)로 공식 문서에 명시되어 있다. **위험으로 인지하되 채택을 막을 사유는 아니다** — MIT 라이선스로 포크 가능하고, 대안 후보(`node-sql-parser`는 완전한 AST/실행 지향이라 이번 요구사항에 과함, `@sqltools/formatter`는 dialect 커버리지가 좁음, `poor-mans-t-sql-formatter`는 T-SQL 전용)보다 이 프로젝트의 6-dialect 요구를 가장 잘 만족한다.

### 6.3 대안 비교 요약

| 후보 | Dialect 커버리지 | 판정 |
|---|---|---|
| `sql-formatter` | 요구 6종 전부 네이티브 지원 | **채택** |
| `node-sql-parser` | dialect별 지원하나 완전한 AST/실행 파서 지향, bundle 무거움, 이번 "정렬만" 요구에 과도 | 기각 |
| `@sqltools/formatter` | dialect 옵션 제한적(주로 Generic) | 기각 |
| `poor-mans-t-sql-formatter` | T-SQL 전용, 나머지 5개 dialect 미지원 | 기각 |

### 6.4 Comma Style(Should Have) 구현 위험

- `sql-formatter`는 leading/trailing comma 전환 옵션(`commaPosition`)을 **제공하지 않는다**. 과거 버전에 있었으나 제거되었고, 재도입 요청([issue #697](https://github.com/sql-formatter-org/sql-formatter/issues/697))은 관리자가 "not planned"로 종료했다.
- 따라서 Comma Style을 구현하려면 라이브러리가 출력한 **trailing-comma 확정 결과 문자열**에 대해 프로젝트 자체의 후처리 변환을 작성해야 한다. 이 변환은 문자열 리터럴·주석 내부의 `,` 문자를 건드리면 안 되므로, 반드시 라이브러리가 이미 정규화한 줄 구조(각 컬럼이 독립된 줄에 위치)를 전제로 한 **줄 단위** 정규식 변환으로 한정하고, 컬럼 목록 바깥(문자열 리터럴 내부에 개행이 없는 SQL 표준 특성상 리터럴이 줄 전체를 차지하는 경우는 사실상 없음)에서는 적용하지 않는다.
- Builder는 이 변환을 별도 순수 함수로 분리하고, "문자열 리터럴에 쉼표가 포함된 경우"를 포함한 전용 유닛 테스트를 통과해야만 Comma Style을 Should Have로 유지한다. 안전성을 자신할 수 없으면 Critic·QA 이전에 Product Owner에게 Could Have로 재분류를 요청한다.

### 6.5 성능과 실행 위치

- `sql-formatter`는 정규식 기반 ReDoS 위험이 있는 백트래킹 정규식 엔진이 아니라 선형에 가까운 토크나이저이므로, `regex-tester`처럼 Web Worker + 1,000ms timeout으로 강제 종료해야 하는 病的 입력 위험은 낮다.
- 그러나 SPEC 요구사항("수천 줄 SQL도 브라우저가 느려지지 않아야 한다")을 만족하는지는 실측이 필요하다. Builder는 구현 직후 10,000줄 이상의 대형 SQL(예: 수백 개 컬럼의 대형 INSERT, 깊게 중첩된 Subquery)로 실제 소요 시간을 측정해 `PROGRESS.md`에 기록한다.
- 측정 결과 메인 스레드 blocking이 200ms를 넘으면 Optimizer 단계에서 Web Worker 오프로딩을 추가한다(단, sql-formatter가 ReDoS류 무한 루프에 빠지는 사례는 알려져 있지 않으므로 timeout 강제 종료보다는 단순 오프로딩 목적).
- Format은 버튼 클릭 기반이며 입력마다 자동 실행하지 않는다(9절). 자동 미리보기를 추가한다면 최소 300ms debounce를 적용한다(regex-tester와 동일한 패턴).

### 6.6 파일 구조

```text
app/[locale]/tools/sql-formatter/page.tsx
components/tools/sql-formatter/sql-formatter.tsx
components/tools/sql-formatter/sql-formatter.test.tsx
lib/tools/sql-formatter/format-sql.ts          # sql-formatter 호출 + 옵션 매핑 + 오류 정규화
lib/tools/sql-formatter/format-sql.test.ts
lib/tools/sql-formatter/comma-style.ts         # Should Have, 6.4절 안전성 확보 시에만 구현
lib/tools/sql-formatter/comma-style.test.ts
lib/tools/sql-formatter/examples.ts            # Should Have 샘플 쿼리
tests/sql-formatter-browser.mjs
messages/{ko,en,ja}.json                        # Tools.sqlFormatter 추가
package.json                                     # "sql-formatter": "<Builder가 설치 시점 최신 안정 버전으로 고정>"
```

- 페이지·locale metadata는 Server Component, DBMS·옵션·입력·결과 상태는 Client Component로 분리한다(기존 도구 패턴과 동일).
- `format-sql.ts`는 `sql-formatter`의 `format()` 호출과 예외를 discriminated union(`{ok:true,value}` / `{ok:false,reason}`)으로 감싼다. `params`/`paramTypes` 옵션은 코드에서 명시적으로 사용하지 않는다(6.1절).
- 새 런타임 의존성 `sql-formatter` 1개 추가. 이 프로젝트는 이미 `qrcode`, `croner`, `iconv-lite`, `ipaddr.js`, `fflate` 등 도구별로 검증된 의존성을 추가해 온 전례가 있으므로 정책과 충돌하지 않는다.

### 6.7 Architect 판정

- 구조 충돌: 없음
- URL/locale 충돌: 없음 — `/{locale}/tools/sql-formatter`는 기존 slug와 겹치지 않음
- 서버 필요성: 없음
- 새 런타임 의존성: `sql-formatter` 1개, MIT 라이선스, 기존 의존성 추가 전례와 일치
- 기존 기능 영향: 홈 카드·공통 메뉴에 항목 1개 추가하는 범위로 제한 가능
- 기술적 차단 요소: 없음. 단, Comma Style(Should Have)은 6.4절 조건부 위험을 Builder가 별도 검증해야 함
- Builder 인계 상태: `READY`

## 7. 포매팅 규칙(Must Have 최소 범위)

다음 구조를 6.1절 라이브러리의 기본 정렬 규칙으로 처리한다. 정확한 출력 형태는 라이브러리 버전에 종속되므로, 아래 예시는 "지향하는 형태"이며 수용 기준은 "구조가 명확히 구분되어 보이는가"를 기준으로 판정한다(라이브러리가 만드는 정확한 공백 수까지 SPEC이 강제하지 않는다).

### 7.1 SELECT / FROM / JOIN / WHERE / GROUP BY / HAVING / ORDER BY / LIMIT / OFFSET

```sql
SELECT
    a,
    b,
    c
FROM users
WHERE
    a = 1
    AND b = 2;
```

### 7.2 JOIN

```sql
SELECT
    u.id,
    o.total
FROM users AS u
LEFT JOIN orders AS o
    ON u.id = o.user_id
WHERE
    o.status = 'paid';
```

`JOIN`, `LEFT JOIN`, `RIGHT JOIN`, `INNER JOIN`, `FULL JOIN` 모두 줄바꿈하고 `ON` 조건을 들여쓴다.

### 7.3 CASE

```sql
CASE
    WHEN score >= 90 THEN 'A'
    WHEN score >= 80 THEN 'B'
    ELSE 'C'
END
```

### 7.4 CTE(WITH)

```sql
WITH active_users AS (
    SELECT
        id,
        name
    FROM users
    WHERE status = 'active'
),
order_totals AS (
    SELECT
        user_id,
        SUM(total) AS total
    FROM orders
    GROUP BY user_id
)
SELECT ...
```

### 7.5 Subquery

부모 쿼리 기준으로 추가 들여쓰기 수준을 적용한다.

### 7.6 INSERT / UPDATE / DELETE, DDL(CREATE TABLE / ALTER TABLE / DROP TABLE)

```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP
);
```

### 7.7 UNION / UNION ALL, Window Function

각 `SELECT` 블록을 독립적으로 정렬하고 `UNION`/`UNION ALL` 앞뒤로 줄바꿈한다. Window function(`OVER (...)`)은 괄호 안 `PARTITION BY`/`ORDER BY`를 원본 라이브러리 규칙대로 정렬하며 별도 커스터마이즈하지 않는다.

### 7.8 Multi Statement

세미콜론으로 구분된 여러 SQL 문을 각각 독립적으로 정렬하고 문장 사이에 빈 줄을 유지한다(`linesBetweenQueries` 옵션 활용).

## 8. 설정 옵션

| 옵션 | 값 | 기본값 |
|---|---|---|
| Keyword Case | UPPERCASE / lowercase / Preserve | UPPERCASE |
| Indent | 2 spaces / 4 spaces / Tab | 4 spaces |
| Logical Operator 줄바꿈(Should Have) | AND/OR를 항상 새 줄로 / 원본 유지 | 항상 새 줄로 |
| Comma Style(Should Have, 6.4절 조건부) | Trailing / Leading | Trailing |

- Keyword Case는 `keywordCase`(및 표시 일관성을 위해 `dataTypeCase`, `functionCase`도 동일 값으로 동기화)로 매핑한다. `identifierCase`는 사용자가 작성한 테이블·컬럼명을 임의로 변경할 수 있으므로 **사용하지 않는다** — 대소문자가 의미를 가지는 DBMS(PostgreSQL unquoted identifier 등)에서 의미가 바뀔 수 있다.
- Indent는 `tabWidth`/`useTabs`로 매핑한다.
- 옵션 변경은 즉시 재정렬하지 않고 다음 Format 실행 시 반영한다(9절 상태 전이와 일치).

## 9. 초기 상태와 상태 전이

- 기본 DBMS는 Generic SQL, Keyword Case는 UPPERCASE, Indent는 4 spaces다.
- 최초 진입 시 입력·결과는 비어 있고 오류 상태가 없다.
- 빈 입력에서는 Format, Minify, Copy, Swap이 disabled다. Clear는 입력이 있을 때만 enabled다.
- DBMS 또는 옵션을 변경해도 입력은 유지하고, 이미 표시된 결과·오류는 유지한다(다음 Format 실행 전까지 "이 결과가 새 옵션 기준인지" 오인하지 않도록 결과 영역에 마지막 Format 시점의 DBMS·옵션 요약을 함께 표시한다).
- Format은 버튼 클릭으로만 실행한다(자동 실행 없음, Should Have로 debounce 자동 미리보기를 추가하더라도 최소 300ms).
- Format 성공 시 입력은 변경하지 않고 결과 영역만 갱신한다.
- Format 실패(파싱 오류) 시 입력을 삭제·변경하지 않고 결과를 지운 뒤 오류 메시지를 표시한다(12절).

## 10. Minify(Should Have)

- 정렬된 SQL을 한 줄 또는 최소 공백 형태로 축소한다.
- 문자열 리터럴 내부 공백은 변경하지 않는다.
- Minify도 6.1절 라이브러리의 compact 출력 기능 또는 Format 결과에 대한 별도 whitespace 축소 로직으로 구현하되, 문자열·주석 내부를 손상시키지 않는지 전용 유닛 테스트로 검증한다.

## 11. 의미 보존 원칙 — 문자열·주석·Placeholder 안전성

이 기능에서 가장 중요한 요구사항이다. 다음 요소는 포매팅 전후 **완전히 동일**해야 한다.

- 문자열 리터럴 내용(`'hello world'`, `'SELECT FROM WHERE'`, JSON 문자열, URL 등 SQL 문법상 의미 없는 텍스트를 포함)
- Identifier(테이블명, 컬럼명, alias) — 대소문자·철자 모두
- Literal(숫자, boolean, NULL)
- Operator(`=`, `<>`, `::`, `||` 등 dialect별 연산자)
- Placeholder/변수: `?`, `$1`, `:username`, `@userId`, `#{userId}` 등 — 가능한 범위에서 원문 그대로 보존(6.1절, `params` 옵션 미사용으로 보장)
- Comment 내용(`-- comment`, `/* comment */`) — 삭제하지 않고 텍스트를 변경하지 않는다. 정확한 줄 위치는 정렬 규칙에 따라 이동할 수 있지만 원래 의도한 코드와의 연관성이 크게 어긋나지 않아야 한다.

QA는 "포매팅 전후 의미가 바뀌었는가"를 최우선 실패 기준으로 삼는다(17절).

## 12. 오류 처리

### 12.1 Syntax Validation

- 선택한 dialect 기준으로 라이브러리가 파싱에 실패하면 오류를 표시한다.
- 오류 문구는 "완전한 DB 실행 오류 검사기"로 표현하지 않는다. 예: "SQL 문법을 분석하지 못했습니다. 실제 DB 실행 가능 여부를 보장하지 않습니다."와 동등한 locale별 안내를 사용한다.

### 12.2 Formatting 실패(지원하지 않는 vendor-specific 문법 포함)

- 입력 SQL을 삭제·변경하지 않는다(원본 유지).
- 사용자 친화적 오류 메시지를 표시한다. 예: "선택한 PostgreSQL 문법으로 분석할 수 없습니다."와 동등한 문구.
- "Generic SQL로 다시 시도" 액션을 Should Have로 제공한다 — 클릭 시 DBMS를 Generic SQL로 전환하고 동일 입력으로 재시도한다(입력은 유지).
- 원시 라이브러리 예외 메시지, stack trace를 그대로 노출하지 않고 로컬라이즈된 안내로 감싼다.

## 13. UI 및 접근성

- 화면 순서: 제목/설명 → DBMS 선택 → 설정(Keyword Case/Indent/Comma Style 등) → SQL 입력 → Format/Minify/Clear/Swap → 결과(읽기 전용) → Copy/Download → 오류/개인정보 안내 → 예제 쿼리.
- DBMS 선택은 select 또는 segmented control로 제공하고 현재 선택을 명확히 표시한다.
- 입력·결과는 별도 textarea이며 결과는 read-only다. 긴 SQL은 textarea 내부에서 wrap 또는 스크롤하며 페이지 폭을 늘리지 않는다.
- Format 버튼은 primary, Minify/Clear/Copy/Swap은 secondary다.
- 320px 이상에서 DBMS 선택, 옵션, 입력/결과 textarea, 버튼이 가로 overflow·잘림·겹침을 만들지 않는다.
- 주요 버튼과 select는 최소 44px 터치 영역을 제공한다(이번 세션에서 반복 발견된 회귀 유형이므로 QA에서 특히 확인).
- 키보드만으로 DBMS 선택, 옵션 변경, 입력, Format, Copy, Clear를 사용할 수 있고 focus 표시를 숨기지 않는다.
- Syntax 오류는 `role="alert"`, Copy 성공 등은 `aria-live="polite"`로 알린다.

## 14. 다국어, SEO 및 탐색

- 모든 사용자 문구는 `messages/ko.json`, `messages/en.json`, `messages/ja.json`의 `Tools.sqlFormatter` namespace에서 관리한다.
- DBMS 이름(MySQL, PostgreSQL, SQL Server, Oracle, SQLite, Generic SQL)은 고유명사이므로 locale별 번역 대신 표준 표기를 유지하되 설명 문구는 각 locale로 제공한다.
- canonical은 현재 locale URL, language alternates는 세 locale의 `tools/sql-formatter`를 가리킨다.
- 홈 카드와 공통 반응형 메뉴(개발자 카테고리)에 현재 locale을 유지하는 링크를 등록한다.

## 15. 개인정보·보안·성능

- 입력 SQL과 결과는 서버, 외부 API, 분석 서비스로 전송하거나 URL, 쿠키, localStorage, sessionStorage, IndexedDB에 저장하지 않는다.
- 페이지에 "입력한 SQL은 브라우저에서 처리됩니다." 취지의 안내를 표시한다.
- 실제 Database에 연결하지 않고 SQL을 실행하지 않는다(4절).
- 입력 길이에 임의 제한을 두지 않되, 6.5절 성능 실측을 근거로 과도하게 큰 입력(예: 수십만 자)에 대한 안내나 제한을 Optimizer 단계에서 재검토할 수 있다.
- 새 런타임 의존성은 `sql-formatter` 1개로 제한한다(6.6절).

## 16. 수용 기준

1. 초기 상태는 Generic SQL·UPPERCASE·4 spaces이며 Format/Minify/Copy/Swap이 disabled, 입력·결과·오류가 비어 있다.
2. `SELECT a,b,c FROM users WHERE a=1 AND b=2;`를 Generic SQL로 Format하면 SELECT 컬럼이 줄마다 나뉘고 WHERE 조건이 들여써진다(7.1절 형태).
3. JOIN을 포함한 쿼리가 JOIN마다 줄바꿈되고 ON 조건이 들여써진다(7.2절).
4. CASE 표현식이 WHEN마다 줄바꿈되어 정렬된다(7.3절).
5. WITH(CTE)가 각 CTE를 구분해 정렬된다(7.4절).
6. CREATE TABLE이 컬럼마다 줄바꿈되어 정렬된다(7.6절).
7. 세미콜론으로 구분된 다중 SQL 문이 각각 독립적으로 정렬된다(7.8절).
8. MySQL dialect에서 backtick identifier, `LIMIT`이 깨지지 않는다.
9. PostgreSQL dialect에서 `::` 타입 캐스트, `ILIKE`, `DISTINCT ON`이 깨지지 않는다.
10. SQL Server(T-SQL) dialect에서 `TOP`, `[]` identifier, `WITH (NOLOCK)`이 깨지지 않는다.
11. Oracle(PL/SQL) dialect에서 `ROWNUM`, `FETCH FIRST`가 깨지지 않는다.
12. SQLite dialect에서 `ON CONFLICT`가 깨지지 않는다.
13. Keyword Case를 lowercase/Preserve로 바꾸면 결과의 키워드 대소문자가 그에 맞게 바뀐다.
14. Indent를 2 spaces/Tab으로 바꾸면 결과 들여쓰기가 그에 맞게 바뀐다.
15. `-- comment`와 `/* comment */`가 Format 후에도 삭제되지 않고 텍스트가 보존된다.
16. 문자열 리터럴에 SQL 키워드(`'SELECT FROM WHERE'`)가 포함되어도 리터럴 내용이 변경되지 않는다.
17. `?`, `$1`, `:username`, `@userId` 등 placeholder가 가능한 범위에서 원문 그대로 보존된다.
18. 지원하지 않는 vendor-specific 문법에서 파싱에 실패하면 입력이 보존되고 사용자 친화적 오류가 표시된다(12.2절).
19. 빈 SQL, 잘못된 SQL, 10,000자 이상 SQL, 한글 alias, Emoji가 포함된 문자열에서 앱이 깨지지 않는다.
20. Copy는 결과를 정확히 복사하고 성공을 알리며, 거부·미지원 시 결과를 유지하고 Console Error 없이 친절한 오류를 표시한다.
21. 320/375/768/1280px에서 핵심 흐름이 가능하고 문서 가로 overflow·잘림·겹침이 없다.
22. 키보드만으로 전체 흐름을 완료할 수 있다.
23. `ko/en/ja` URL의 기능·번역·metadata·canonical·hreflang과 홈/공통 메뉴 링크가 올바르다.
24. 정상·오류 흐름에서 Console Error와 unhandled rejection이 0이다.
25. 입력 SQL의 고유 문자열이 네트워크 요청·URL·브라우저 저장소에 없고 offline에서도 핵심 변환이 동작한다.
26. (Should Have 채택 시) Minify 결과가 문자열 리터럴 내부 공백을 보존한 채 한 줄로 축소된다.
27. (Should Have 채택 시) Comma Style을 Leading으로 바꾸면 6.4절 안전성 조건을 만족한 채로 쉼표 위치가 바뀐다.

## 17. 필수 테스트 계획

### 자동 검사

- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run build`
- `npm audit --audit-level=high`
- 필수 테스트에는 fail, skip, todo가 없어야 한다.

### 순수 로직 테스트(`lib/tools/sql-formatter/format-sql.test.ts` 등)

- MySQL: `SELECT * FROM users WHERE id=1 LIMIT 10;`
- PostgreSQL: `SELECT DISTINCT ON (user_id) user_id,created_at FROM logs ORDER BY user_id,created_at DESC;`
- PostgreSQL 타입 캐스트: `SELECT payload::jsonb FROM events;`
- SQL Server: `SELECT TOP 10 id,name FROM users ORDER BY id DESC;`
- SQL Server: `SELECT * FROM users WITH (NOLOCK);`
- Oracle: `SELECT * FROM users WHERE ROWNUM <= 10;`
- SQLite: `INSERT INTO users(name) VALUES('Kim') ON CONFLICT(name) DO NOTHING;`
- CTE, Subquery, CASE, 다중 JOIN, 중첩 쿼리
- CREATE TABLE, INSERT, UPDATE, DELETE
- 다중 statement(세미콜론 구분)
- `-- comment`, `/* block comment */` 보존
- 문자열 리터럴 안에 SQL 키워드가 포함된 경우(`'SELECT FROM WHERE'`)
- 잘못된 SQL(`SELECT FROM users`) → 오류, 원본 보존
- 빈 SQL
- 10,000자 이상 SQL
- 한글 alias(`SELECT a AS 이름 FROM t`)
- Emoji/특수문자 포함 문자열
- Keyword Case 3종(UPPERCASE/lowercase/Preserve) × 대표 쿼리
- Indent 3종(2 spaces/4 spaces/Tab) × 대표 쿼리
- (Should Have) Minify 왕복, Comma Style 왕복, 문자열 내부 쉼표 보존

### UI 테스트(`components/tools/sql-formatter/sql-formatter.test.tsx`)

- 초기 상태와 disabled 조건
- DBMS·옵션 변경 시 입력 유지, 결과·오류 처리
- Format 성공/실패 상태 전이
- Copy 성공·미지원·거부
- Clear/focus 이동

### QA 실제 Chrome(`tests/sql-formatter-browser.mjs`)

- production build, 최신 안정 Chrome
- viewport 320×800, 375×812, 768×1024, 1280×900
- `ko`, `en`, `ja` 전체 조합
- 16절 수용 기준 1~25(및 Should Have 채택 시 26~27)에 대응하는 실제 브라우저 시나리오
- 직접 URL, reload, back/forward, 홈 카드와 공통 메뉴 이동
- 키보드 전용 흐름, focus 순서, 44px 터치 영역
- Console Error, page error, unhandled rejection 0
- 입력 고유 문자열이 네트워크 요청·URL·브라우저 저장소에 없는지 검사
- (성능) 10,000줄 이상 SQL Format 소요 시간 실측 기록(6.5절)

### Critic 필수 질문(최소 10개 중 다음 6개는 반드시 포함)

1. 사용자가 DBMS를 왜 선택해야 하는지 이해할 수 있는가?
2. 긴 SQL도 포맷 후 구조를 한눈에 파악할 수 있는가?
3. Comment가 원래 의미를 유지하는가?
4. DBMS 전용 문법이 formatter 때문에 깨지지 않는가?
5. 지원하지 않는 SQL에서 잘못된 결과를 조용히 만들지 않는가?
6. Copy/Format 등 핵심 기능 접근성이 좋은가?

## 18. 완료 조건

`docs/EVALUATION.md`에 따라 다음을 모두 만족해야 `DONE`이다.

- Critic 평가 90/100 이상
- 통합 이슈 목록 Critical 0, High 0
- TypeScript 오류 0
- Console Error 0
- Generic SQL, MySQL, PostgreSQL, SQL Server, Oracle, SQLite 각각 PASS
- Comment 보존 PASS, Literal/Placeholder 보존 PASS
- Multi statement PASS, Keyword Case PASS, Indentation PASS
- 모바일 PASS
- 입력 SQL 서버 전송 없음(네트워크 검사 포함)
- 모든 수용 기준에 QA 실행 증거 연결
- 최대 5회 개선 후에도 미달이면 `NEEDS HUMAN REVIEW`

Builder와 Optimizer는 완료를 자체 승인하지 않는다. Critic이 점수를 산정하고 QA가 게이트 증거를 제공한 뒤 Product Owner가 최종 상태만 기록한다.
