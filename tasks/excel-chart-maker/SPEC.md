# 엑셀·CSV 그래프 만들기 / Excel & CSV Chart Maker SPEC

## 문서 상태

- 상태: `DONE`
- 작성일: 2026-09-02
- 예정 URL: `/{locale}/tools/excel-chart-maker`
- 지원 locale: `ko`, `en`, `ja`
- 우선순위: P0
- 유일한 구현 기준: 이 문서
- 현재 단계: Builder 구현, Critic 회차 0, QA, Optimizer 회차 1 및 Critic·QA 재검증 완료
- 완료 기준: 이 문서의 기능별 강화 기준과 `docs/EVALUATION.md`를 모두 충족

## 1. 목적과 사용자 가치

사용자가 Excel 또는 CSV 파일을 서버에 올리지 않고 브라우저에서 분석하여, 사용할 열과 차트 유형을 선택하고 정확한 크기의 PNG/JPG/SVG 이미지로 저장하게 한다.

대표 흐름은 `파일 선택 → 시트·헤더 확인 → 데이터 미리보기 → X/Y 선택 → 차트·디자인 조정 → 크기 지정 → 다운로드`다. 자동 추론은 시작을 돕지만 확정 사실로 취급하지 않으며 사용자가 언제든 변경할 수 있어야 한다.

V1의 목표는 “Excel을 잘 모르는 사람도 업무 표를 읽기 쉬운 차트 이미지로 만드는 것”이다. Excel 편집기, 수식 엔진 또는 BI 대시보드로 확장하지 않는다.

## 2. 대상 사용자와 대표 작업

- 보고서·발표·블로그에 사용할 차트 이미지를 빠르게 만들려는 일반 사용자
- 회사 자료를 외부 서버에 업로드할 수 없는 사용자
- CSV 또는 여러 시트가 있는 Excel에서 원하는 열만 차트로 만들려는 사용자
- SNS·문서 규격에 맞는 정확한 픽셀 크기가 필요한 사용자
- 모바일에서 간단한 표를 확인하고 차트로 저장하려는 사용자

## 3. 범위와 우선순위

### Must Have — V1 완료 및 QA 대상

- `.xlsx`, `.xls`, `.csv` 단일 파일, 파일 선택과 Drag & Drop
- 파일 signature·확장자·크기 검증, 암호화·손상 파일의 복구 가능한 오류
- 모든 처리를 브라우저에서 수행하고 파일·셀 값을 전송하거나 저장하지 않음
- 여러 시트 선택, 헤더 행 또는 헤더 없음 선택, 데이터 시작 행 자동 연동
- 파일명·크기·시트 수·현재 시트·전체 행/열 수 표시
- 처음 20행만 렌더링하는 데이터 미리보기
- String, Number, Percentage, Currency-like, Date, DateTime, Boolean, Empty/Unknown 타입 추론
- X축과 Y축 선택, 최대 5개 Y series, 산점도의 numeric X/Y 전용 선택
- 세로 막대, 가로 막대, 라인, 원형, 도넛, 영역, 산점도
- 규칙 기반 자동 차트 추천과 부적합 데이터 경고
- SUM, AVG, COUNT, MIN, MAX, 집계 없음
- 원본 순서, X 오름/내림차순, 값 높은/낮은 순, Top N
- 제목·부제목, 범례 상/하, 데이터 라벨, 축 표시, Grid, 숫자 표시 형식
- 기본·심플·다크·프레젠테이션 테마, 배경 흰색·다크·투명, series 색상
- 1200×630, 1080×1080, 1920×1080, 1080×1920, 1000×1500, 1200×1200 preset과 사용자 크기
- PNG, JPG, SVG 다운로드와 1×/2×/3× 출력
- 미리보기와 출력의 동일한 가상 레이아웃·비율, 정확한 raster pixel dimensions
- 예제 데이터로 시작하기, 차트 설정 초기화, 파일 제거, 전체 초기화
- 파일 교체·시트 변경 시 유효하지 않은 열 참조 제거
- `ko`, `en`, `ja`, metadata, canonical/hreflang, 메뉴·홈 도구 목록·sitemap 등록
- 320/375/768/1440px 반응형, 키보드와 스크린리더 지원

필수 QA 목록에 포함된 기존 Should 항목인 자동 추천, 다중 series, 집계, 정렬, Top N, 데이터 라벨, JPG, SVG, 2×/3×, 예제 데이터, 테마, 숫자 형식, 투명 배경은 V1 Must로 승격한다. 구현 범위와 완료 조건이 어긋나는 것을 방지하기 위한 결정이다.

### Should Have — V1 후속, 현재 완료 조건에서 제외

- TSV 파일과 Excel/Google Sheets 표 붙여넣기
- 사용자가 CSV delimiter와 인코딩을 직접 고르는 고급 설정
- Y축 제목·최소·최대·0 시작 옵션
- 제목 기반 안전한 파일명 제안
- Pie의 값/비율/값+비율 라벨 선택
- 사용자가 추론된 컬럼 타입을 수정하는 기능
- 누적 막대와 100% 누적 막대

### Could Have — 별도 승인 필요

- ODS, JSON 배열 import, PDF export
- Combo, Radar, Bubble, Waterfall, Funnel, Treemap, Heatmap, 누적 영역
- 차트 데이터 직접 편집, 날짜 범위·카테고리 필터
- LTTB 등 추세 보존 downsampling, Pie의 기타 묶기
- Slice별 색상, 파스텔·모노톤 테마, 복잡한 annotation
- 실제 기능이 다른 bar/pie/line 전용 검색 랜딩

### Do Not Build — V1

- Excel 완전 편집기, formula 계산 엔진, Pivot Table, BI Dashboard
- 암호화 Excel 해제, VBA·매크로 실행
- 로그인, Cloud Save, 최근 파일, 공유 URL, 실시간 협업
- Google Sheets API, 외부 URL 파일 import, AI 데이터 분석
- 원본 파일 수정 또는 결과를 Excel에 다시 기록하는 기능

## 4. 입력 파일 계약

### 형식과 검증

| 형식 | 확장자 | 검증 | 처리 |
|---|---|---|---|
| OOXML workbook | `.xlsx` | ZIP signature `50 4B`, workbook parse | SheetJS CE |
| OLE Compound workbook | `.xls` | CFB signature `D0 CF 11 E0 A1 B1 1A E1`, workbook parse | SheetJS CE |
| Delimited text | `.csv` | NUL 비율·decode·CSV parser 결과·열 일관성 | TextDecoder + Papa Parse |

- `accept`와 확장자는 선택 편의 정보이지 단독 허용 근거가 아니다.
- MIME은 운영체제마다 비거나 달라질 수 있어 allowlist 참고값으로만 쓰며 signature와 실제 parse 결과를 함께 검사한다.
- `.xlsx/.xls` 확장자와 signature가 불일치하면 파싱하지 않는다.
- 암호화 workbook, 매크로 실행, 외부 연결 갱신은 지원하지 않는다.
- formula는 실행하지 않는다. 파일에 저장된 cached result만 사용하고 결과가 없으면 missing으로 표시하며 이유를 안내한다.
- 병합 셀은 값이 존재하는 anchor cell 기준으로 읽고, 헤더 범위의 merge로 열 이름이 불명확하면 경고한다.

### 자원 제한

- 파일 크기 상한: 25 MiB
- sheet 수 상한: 100
- 선택 sheet의 행 상한: 100,000, 열 상한: 50
- materialize하는 non-empty cell 상한: 2,000,000
- chart series 상한: 5
- preview DOM 행: 20, 열: 최대 50
- 한도를 넘으면 탭을 멈추게 하지 않고 “파일이 처리 한도를 넘었습니다. 필요한 행·열만 남겨 다시 저장해 주세요.”라고 안내한다.
- 100,000×50 QA fixture는 sparse/밀집 두 종류로 둔다. sparse는 정상 처리하고 2백만 non-empty cell을 넘는 dense fixture는 빠르고 안전하게 거부하면 PASS다.

## 5. CSV와 문자 인코딩 계약

- delimiter 자동 감지는 comma, semicolon, tab만 후보로 제한한다.
- quoted delimiter, escaped quote, CRLF/LF, quoted multiline field를 처리한다.
- BOM이 있으면 UTF-8/UTF-16 BOM을 우선한다. BOM이 없으면 fatal UTF-8 decode를 먼저 시도한다.
- UTF-8이 실패하면 `TextDecoder('euc-kr', {fatal: true})`를 시도한다. WHATWG의 `euc-kr` decoder는 배포 환경 호환을 위해 Windows-949 계열 mapping을 포함하므로 UI에는 `한국어(CP949/EUC-KR 호환)`이라고 표시한다.
- 자동 감지는 확정 사실로 표시하지 않는다. UTF-8과 한국어 legacy decode가 모두 가능하면 UTF-8을 선택하고 적용 인코딩을 표시한다.
- replacement character가 생기는 decode는 자동 성공으로 인정하지 않는다.
- CSV 안의 선언만으로 인코딩을 신뢰하지 않으며 외부 라이브러리나 서버 감지 API를 호출하지 않는다.
- 고급 수동 인코딩 선택은 Should지만, UTF-8 및 CP949/EUC-KR 자동 fallback은 V1 Must다.

## 6. 데이터 내부 모델

파서·정규화·차트 변환·renderer를 분리한다.

```ts
type CellKind =
  | "string" | "number" | "percentage" | "currency"
  | "date" | "datetime" | "boolean" | "empty" | "unknown";

type NormalizedCell = {
  raw: unknown;
  value: string | number | boolean | null;
  kind: CellKind;
  display: string;
  numberFormat?: string;
  sourceRow: number;
};

type NormalizedColumn = {
  id: string;
  label: string;
  inferredKind: CellKind;
  sourceColumn: number;
};

type NormalizedTable = {
  source: "xlsx" | "xls" | "csv" | "tsv" | "clipboard" | "json";
  sheetId: string;
  columns: NormalizedColumn[];
  rows: NormalizedCell[][];
  rowCount: number;
};

type ChartConfig = {
  chartType: "bar" | "horizontal-bar" | "line" | "pie" | "donut" | "area" | "scatter";
  xColumnId: string;
  yColumnIds: string[];
  aggregation: "none" | "sum" | "avg" | "count" | "min" | "max";
  sort: "source" | "x-asc" | "x-desc" | "value-asc" | "value-desc";
  topN: number | null;
};
```

- library-specific option은 `ChartScene → EChartsOption` adapter 내부에만 둔다.
- column id는 중복 header label이 아니라 source column index 기반의 안정된 id다.
- 원본 `raw`, 계산용 `value`, 표시용 `display`를 분리하여 형식화가 숫자 정확성을 바꾸지 않게 한다.
- 향후 TSV/Clipboard/JSON parser도 `NormalizedTable`만 반환하여 같은 추천·집계·renderer를 사용한다.

## 7. 정규화와 타입 추론

파이프라인은 `bytes → parser raw cells → header/data range → NormalizedTable → type profile → ChartDataset → ChartScene` 순서다.

1. 헤더 후보는 처음 20행에서 non-empty 비율, 문자열 비율, 다음 3행의 반복 타입과 고유성을 점수화한다.
2. 자동 선택한 header는 “자동 선택: N행”으로 표시하며 1~최대 20행 또는 헤더 없음을 사용자가 바꿀 수 있다.
3. header 다음 행이 data start다. 별도 data-start control은 V1에서 만들지 않는다. 헤더 없음이면 첫 non-empty 행부터 data다.
4. 중복·빈 header는 각각 `이름 (2)`, `열 A`처럼 UI label만 보완한다.
5. 최대 1,000개 non-empty sample을 전 범위에 균등 분포로 뽑아 타입을 추론한다. 첫 몇 행에만 의존하지 않는다.
6. 90% 이상 같은 해석을 공유할 때 해당 타입으로 정하고, 혼합이면 string 또는 unknown으로 둔다. 추론 근거와 변환 실패 수를 보관한다.
7. 숫자 문자열은 locale-independent하고 모호하지 않은 패턴만 변환한다. `1,200`, `-1,250.50`, `₩1,200`, `1,200원`, `$1,250.50`, `25%`를 지원한다.
8. `0`은 유효 숫자이고 empty/null/error와 구분한다. `#N/A`, `#VALUE!`, `#DIV/0!`, `#REF!`, 빈 셀은 missing이며 자동으로 0이 되지 않는다.
9. Percentage는 Excel numeric value와 number format의 `%`를 함께 사용한다. raw `0.25`만으로 percentage라 단정하지 않는다.
10. Currency는 numeric value를 계산에 쓰고 통화 symbol·format은 display metadata로만 쓴다.

## 8. 날짜 처리

- SheetJS parse option에서 날짜와 number format 정보를 보존하고 workbook의 1900/1904 date system을 확인한다.
- Excel serial은 parser의 공식 date conversion을 통해 `{year, month, day, hour, minute, second}` 형태의 calendar parts로 정규화한다.
- date-only는 UTC timestamp로 왕복하지 않고 `YYYY-MM-DD` calendar key로 보관해 timezone에 따른 하루 이동을 방지한다.
- datetime은 원본에 timezone이 없으면 local/UTC를 임의 확정하지 않고 timezone-less parts로 유지한다.
- 문자열 날짜는 `YYYY-MM-DD`, `YYYY/MM/DD`, `YYYY.MM.DD`처럼 명시한 패턴만 자동 인식한다. `01/02/03` 같은 모호한 값은 string이다.
- QA fixture의 `2026-09-01`이 어느 locale/timezone에서도 전날이나 다음 날로 바뀌면 FAIL이다.

## 9. 차트 데이터와 유효성

- 기본 X는 첫 string/date 컬럼, 기본 Y는 첫 numeric/percentage/currency 컬럼이다.
- Date + numeric은 line, numeric + numeric은 scatter, string category + numeric은 vertical bar를 기본 추천한다.
- category가 6개 이상이거나 평균 label 길이가 8자 이상이면 horizontal bar를 보조 추천한다.
- category 2~6개·Y 1개·모든 값이 0 이상이면 pie/donut을 선택 가능하게 하되 자동 기본값은 bar다.
- ordered date/month category는 line을 우선한다. 추천 사유를 한 문장으로 표시한다.
- scatter는 numeric X와 numeric Y 하나만 허용한다.
- pie/donut은 Y 하나, finite value, 음수 없음, 합계가 0보다 큼을 요구한다. 7개 이상이면 High가 아닌 경고와 bar 추천을 표시하며 20개 초과는 생성을 막는다.
- line/area에 순서 없는 string category가 오면 경고하되 생성은 허용한다.
- missing은 bar/pie/scatter에서 skip, line/area에서 gap이 기본이다. 0으로 자동 대체하지 않는다.

## 10. 집계·정렬·Top N

- 순서는 `유효 행 선택 → X key 정규화 → group → aggregate → sort → Top N → chart validation`으로 고정한다.
- `none`은 원본 행을 유지한다. 동일 X의 자동 SUM은 하지 않는다.
- SUM/AVG/MIN/MAX는 finite numeric 값만 사용하고, 유효 값이 없는 group은 missing이다.
- COUNT는 missing이 아닌 선택 Y cell 수를 센다.
- AVG는 합계/유효 개수이며 반올림은 표시 단계에서만 한다.
- 다중 series는 각 series를 독립 집계한다.
- 값 기준 sort와 Top N은 첫 번째 선택 Y를 기준으로 하고 UI에 이를 명시한다.
- date X 오름차순은 calendar key를 사용한다. 기본은 원본 순서다.
- Top N 범위는 1~100이고 전체보다 크면 전체를 표시한다.

## 11. 차트 유형별 한도

| 차트 | 권장 | hard limit | 초과 처리 |
|---|---:|---:|---|
| Pie/Donut | 2~6 categories | 20 | 7부터 경고, 20 초과 차단 |
| Vertical/Horizontal Bar | 50 categories | 500 | Top N/집계 안내 후 차단 |
| Line/Area | 1,000 points/series | 5,000 | 1,000부터 경고, 5,000 초과 차단 |
| Scatter | 2,000 points | 10,000 | 2,000부터 경고, 10,000 초과 차단 |

- downsampling은 V1에서 하지 않는다. 데이터를 조용히 버리거나 샘플 결과를 전체처럼 표시하지 않는다.
- 데이터 제한은 renderer 성능뿐 아니라 label 가독성과 오해 가능성을 함께 고려한다.

## 12. UI와 상태

### Desktop

- 상단: 파일 선택/드롭, 개인정보 안내, 파일·시트 정보
- 본문 좌측: `데이터`, `차트`, `디자인`, `이미지 크기·내보내기` 설정
- 본문 우측: 선택 비율을 유지하는 sticky preview
- 하단: 처음 20행 데이터 preview와 전체 행×열 표시

### Mobile

- `파일 → 시트·표 미리보기 → 차트 미리보기 → 데이터 → 차트 → 디자인 → 이미지 크기·다운로드` 순서다.
- 설정은 native `details` 또는 접근 가능한 accordion을 사용하고 현재 작업 section 하나를 우선 펼친다.
- preview는 viewport 안에서 최소 280px 폭을 확보하고 긴 label은 chart 안에서 wrap/truncate 정책을 적용한다.
- 모든 control target은 최소 44×44px이며 가로 스크롤은 데이터 표의 명시적 scroll container에만 허용한다.

### 상태 전이

`empty → reading → parsed → configured → rendering → ready → exporting → exported` 및 각 단계의 recoverable `error`를 구분한다.

- 파일 교체: 이전 workbook/table/chart instance를 해제하고 기본 설정부터 다시 추천한다.
- 시트 변경: header/type/column/config를 다시 계산하며 이전 column id는 무조건 폐기한다. 제목·테마·출력 크기만 유지한다.
- header 변경: rows/type/X/Y/recommendation/aggregation 결과를 재생성한다. 스타일·출력 크기는 유지한다.
- 차트 설정 초기화: 파일과 현재 sheet/header는 유지하고 data/chart/design/export 설정을 기본값으로 돌린다.
- 파일 제거: 파일·sheet·table·chart를 제거하고 empty로 간다.
- 전체 초기화: 모든 상태와 worker/chart/object URL을 해제한다.
- 오래 걸리는 작업은 operation id를 사용하여 stale parse/render/export 결과가 최신 상태를 덮지 못하게 한다.

## 13. 디자인 옵션

- 제목·부제목은 plain text로만 렌더링하며 HTML을 주입하지 않는다.
- legend는 표시/숨김 및 top/bottom을 지원한다.
- X/Y axis와 grid를 각각 표시/숨김할 수 있다. 기본은 axes 표시, horizontal grid 표시다.
- data label은 기본 off다. 활성화 시 겹침 억제 또는 자동 숨김을 적용하고 값 자체는 바꾸지 않는다.
- 숫자 format은 기본, 천 단위, 0~4 소수 자리, %, 원, 달러, 안전한 10자 이내 prefix/suffix를 지원한다.
- 기본·심플·다크·프레젠테이션 preset은 배경·텍스트·grid·palette를 함께 바꾼다.
- series별 color를 변경할 수 있고 WCAG 대비를 자동 보장한다고 주장하지 않는다. 낮은 대비면 텍스트 경고한다.
- font는 로컬 system font stack만 사용한다. 외부 font 요청이나 임의 font embedding은 하지 않는다.

## 14. 출력 계약

### 크기

- logical width/height: 각 200~4,000px
- scale: 1×, 2×, 3×
- 최종 raster 한 변 상한: 8,000px
- 최종 raster 총 pixel 상한: 32,000,000
- preset 또는 사용자 값을 바꿀 때 예상 최종 dimensions를 즉시 표시하고 한도 초과면 export를 disable한다.

### 동일 레이아웃

- 데이터·테마·제목·범례·축 배치를 renderer 독립 `ChartScene`으로 한 번 계산한다.
- preview는 logical dimensions와 같은 aspect ratio의 container에 같은 `ChartScene`을 렌더링하고 CSS로 축소한다.
- raster export는 detached container를 logical width/height로 만들고 ECharts Canvas renderer를 `devicePixelRatio=scale`로 초기화한다. `getDataURL({pixelRatio: 1})` 결과를 decode하여 실제 dimensions를 검사한 뒤 다운로드한다.
- SVG export는 같은 scene을 ECharts SVG renderer의 logical width/height로 렌더링하고 직렬화한다. SVG의 `width`, `height`, `viewBox`와 XML parsing을 검사한다.
- preview와 export는 별도 option builder를 갖지 않는다. hover tooltip·animation처럼 export에 부적절한 interaction만 공통 builder의 mode flag로 끈다.

### 형식

- PNG: 투명/불투명 배경, 정확한 최종 dimensions
- JPG: quality 0.8/0.9/1.0, alpha는 선택 배경 또는 흰색으로 합성, MIME과 dimensions 재검증
- SVG: logical size의 vector, 외부 image/font/style 참조 없음, script/event handler 없음
- 파일명 기본값은 `chart.{ext}`이며 사용자가 입력한 파일명은 path separator와 control character를 제거하고 80자 이내로 제한한다.
- Blob/Object URL을 생성한 경우 download 직후 revoke한다. 실패 결과를 다운로드하지 않는다.

## 15. 라이브러리 결정

### Excel parser 비교

| 후보 | XLSX/XLS·sheet | cell/date/formula result | Browser·TS | 크기·유지보수 | 라이선스 | 판정 |
|---|---|---|---|---|---|---|
| SheetJS CE (`xlsx`) | XLSX와 legacy XLS, multi-sheet 지원 | raw type·number format·dates·저장된 formula result 접근 가능, formula 계산은 CE 범위 아님 | browser와 TS definitions 지원 | 기능 범위가 넓어 작지 않으나 필요한 형식 하나로 통합; 공식 배포판 지속 갱신 | Apache-2.0, attribution 필요 | **선택** |
| ExcelJS | XLSX·CSV 중심, XLS 미지원 | rich workbook model에 강점 | browser bundle·types 제공 | 읽기 전용 V1에는 상대적으로 무겁고 XLS 요구 미충족 | MIT | 미선택 |
| 자체 parser | 원하는 최소 API | ZIP/CFB/BIFF/date/format 구현 필요 | 통제 가능 | 정확성·보안·유지비 위험이 매우 큼 | 자체 | 금지 |

선택 버전은 구현 시 공식 SheetJS CE 배포처의 고정 버전을 lockfile로 잠그고 Apache-2.0 attribution을 저장소의 고지 문서에 포함한다. 임의 CDN runtime script는 사용하지 않는다. 공식 문서: [SheetJS CE](https://docs.sheetjs.com/), [라이선스](https://docs.sheetjs.com/docs/miscellany/license/).

### CSV parser 비교

| 후보 | 장점 | 한계 | 판정 |
|---|---|---|---|
| Papa Parse | local File/string, delimiter 감지, quoted multiline, chunk/worker, TypeScript 생태계, MIT | decode 정책을 별도로 통제해야 함 | **선택** |
| SheetJS CSV | dependency 하나로 통합 | CSV 오류·delimiter·streaming 제어가 전용 parser보다 제한적 | 미선택 |
| 자체 state machine | 번들 감소 | RFC edge case와 대용량 검증 부담 | 미선택 |

Papa Parse에는 이미 decode한 string을 전달해 인코딩 판단을 앱이 소유하게 한다. `download` 옵션과 remote URL 입력은 사용하지 않는다. 공식 문서: [Papa Parse](https://www.papaparse.com/docs).

### Chart library 비교

| 후보 | 차트·series·label/theme | renderer·export | Browser·TS·responsive | 번들/유지보수/라이선스 | 판정 |
|---|---|---|---|---|---|
| Apache ECharts | 요구 7종, dataset, 다중 series, label, theme, 대용량 기능 풍부 | Canvas와 SVG, PNG/JPEG/SVG data URL | browser, TS types, resize API | 전체 import는 크지만 core tree-shaking 가능; Apache 프로젝트, Apache-2.0 | **선택** |
| Chart.js | 요구 기본 차트와 plugin 생태계 | Canvas·raster export 우수, native SVG 없음 | TS·responsive 우수 | 비교적 단순, MIT | SVG Must 승격과 단일 export 경로에 부적합 |
| Recharts | React 선언형, 요구 차트, native SVG | SVG 직렬화 가능하나 exact raster export·offscreen pipeline을 별도 구축 | TS·responsive, React 통합 우수 | dependency와 DOM 기반 대량 point 비용; MIT | 편집 UI에는 편리하나 export 정확성 위험 |

ECharts는 `echarts/core`에서 필요한 chart/component와 Canvas/SVG renderer만 등록해 전체 import를 피한다. chart UI는 Client Component에서만 렌더링하고 파일 선택 이후 동적 import한다. 공식 자료: [tree-shakable import와 TypeScript](https://echarts.apache.org/handbook/en/basics/import/), [Canvas와 SVG 선택](https://echarts.apache.org/handbook/en/best-practices/canvas-vs-svg/), [API](https://echarts.apache.org/en/api.html).

## 16. Next.js 통합과 폴더 경계

- `app/[locale]/tools/excel-chart-maker/page.tsx`: Server Component, metadata와 정적 설명 및 Client shell 연결
- `components/tools/excel-chart-maker/`: 업로드·설정·preview UI와 browser-only coordinator
- `lib/tools/excel-chart-maker/model.ts`: library 독립 모델
- `lib/tools/excel-chart-maker/normalize.ts`: type inference·date·numeric normalization
- `lib/tools/excel-chart-maker/chart-data.ts`: validation·aggregation·sort·Top N·recommendation
- `lib/tools/excel-chart-maker/export.ts`: size validation과 export orchestration
- `workers/excel-chart-maker.worker.ts`: parser·normalization·aggregation message protocol
- `tests/excel-chart-maker/fixtures/`: 생성 가능한 비민감 fixture

현재 Next.js 16.3.3 문서에 따라 Server Component가 기본이고 browser API가 필요한 최소 subtree만 `'use client'`로 둔다. `ssr:false`가 필요하면 Server Component에서 쓰지 않고 Client Component 안의 `next/dynamic`에 둔다. parser와 renderer는 정적 공통 bundle에 넣지 않고 명시적 dynamic import로 해당 도구에서만 로드한다.

## 17. Worker와 성능

- Excel parse·CSV parse·정규화·type inference·aggregation은 전용 module Worker에서 수행한다. 25 MiB/100,000행 범위를 메인 스레드에서 처리하면 UI 정지 위험이 커 V1부터 적용한다.
- ArrayBuffer는 worker에 transferable로 넘긴다. UI thread에는 전체 workbook 객체를 복제하지 않고 sheet metadata, preview, normalized column과 현재 chart dataset만 보낸다.
- sheet를 바꿀 수 있도록 raw workbook은 worker 내부 session에만 보관하고 파일 제거/교체/unmount 때 terminate한다.
- progress는 최소 reading/parsing/analyzing 단계로 표시하고 취소 버튼은 worker terminate 후 empty 또는 직전 안정 상태로 복구한다.
- ECharts instance는 한 개 preview를 재사용하고 unmount·renderer 교체 때 `dispose()`한다. export instance는 매번 `dispose()`한다.
- preview·chart type·column select는 즉시 반영한다. 제목/크기 숫자 입력은 250ms debounce하고 stale render를 폐기한다.
- QA 기준 장비는 Chromium 최신 안정판, 4 logical CPU/8GiB 조건을 emulation 또는 동일/낮은 장비로 기록한다.
- 5 MiB/20,000행 일반 fixture: parse+기본 preview 3초 이내, main-thread long task 200ms 초과 0회를 목표로 한다.
- 25 MiB 또는 100,000행 경계 fixture: UI가 계속 반응하고 cancel 가능해야 한다. 절대 시간은 측정 기록으로 남기되 10초 이상 아무 상태 변화가 없으면 FAIL이다.

## 18. 개인정보와 보안

- 파일 bytes, filename, sheet name, header, cell 값, normalized row, 제목·부제목은 서버·외부 API·analytics·error reporter로 보내지 않는다.
- `fetch`, XHR, WebSocket, sendBeacon, Server Action, Route Handler를 파일 처리 흐름에서 사용하지 않는다.
- localStorage, sessionStorage, IndexedDB, Cache API, URL query/history에 원본 또는 파생 데이터를 저장하지 않는다.
- analytics가 있다면 도구 page view와 데이터 없는 chart type/export format 이벤트만 허용하며 filename·크기·행 수조차 기본 전송하지 않는다.
- worker와 chart library는 자체 network 요청을 하지 않는 고정 local bundle로 제공한다.
- CSV와 제목은 text로만 다루고 `dangerouslySetInnerHTML`을 사용하지 않는다.
- 개인정보 안내는 upload control 가까이에 항상 표시한다.

## 19. 오류와 빈 상태

- 업로드 전과 빈 CSV/sheet는 오류가 아니라 안내 상태다.
- 손상·형식 위장·암호화·한도 초과·decode 실패·CSV 구조 오류·numeric Y 부재를 서로 다른 사용자 문구로 표시한다.
- 개발자 exception, stack, parser 내부 코드를 사용자에게 그대로 노출하지 않는다.
- 오류 발생 시 이전 파일의 차트를 새 파일 결과처럼 남기지 않는다.
- export 실패, MIME 불일치, dimensions 불일치는 다운로드를 막고 다시 시도 또는 크기 축소 방법을 안내한다.
- 오류는 `role="alert"` 또는 적절한 `aria-live`로 알리고 control과 `aria-describedby`로 연결한다.

## 20. 접근성·다국어·SEO

- file input, drop zone 대체 버튼, 모든 select/input/color control에 visible label을 제공한다.
- chart type은 radio group 또는 동일한 키보드 semantics를 사용한다.
- 색상만으로 series를 구분하지 않도록 legend text와 현재 설정 요약을 제공한다.
- canvas/SVG preview에는 차트 제목과 series·축·데이터 수를 요약한 접근 가능한 설명을 연결한다. 데이터 표도 유지한다.
- processing, recommendation, warning, error, export 성공은 screen reader에 중복 없이 전달한다.
- ko/en/ja에서 기능과 오류 문구 누락이 없어야 하며 number/date display는 locale에 맞추되 원본 계산값은 바꾸지 않는다.
- 페이지명은 한국어 `엑셀·CSV 그래프 만들기`, 영어 `Excel & CSV Chart Maker`, 일본어 자연 번역을 사용한다.
- 검색 의도는 엑셀 그래프/차트, CSV 그래프/차트, 온라인 막대·원형·라인 차트, 차트 이미지 저장이다.
- 실제 도구를 설명 콘텐츠보다 먼저 배치하고 각 locale의 title/description/canonical/alternates와 sitemap을 등록한다.

## 21. 테스트 기반

### 자동화 명령

- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run build`
- 기능 단위 Vitest: signature, CSV decode/parser, header 추론, type/date/number normalization, aggregation, sorting, Top N, recommendation, limits, filename
- browser E2E: 업로드부터 각 chart preview·export·reset·locale·모바일·console까지

### 필수 fixture

1. 월/매출 기본 XLSX
2. 월/2025/2026 다중 series XLSX
3. category/점유율 Pie 파일
4. date/방문자와 Excel date serial·1900/1904 workbook
5. numeric X/Y scatter
6. 3개 sheet와 sheet별 서로 다른 header
7. header 3행, header 없음, 중복·빈 header
8. 빈 행, null, zero, negative, Excel error cells
9. `1,200`, currency, percentage와 number format
10. cached formula result 있음/없음
11. UTF-8 BOM 유무 CSV, CP949 CSV, comma/semicolon/tab, quoted comma/multiline
12. 정상 legacy XLS
13. 손상·암호화·확장자 위장 workbook
14. 100,000행 sparse와 2백만 cell 초과 dense 파일

fixture는 repository 안에서 script로 재생성 가능해야 하며 실제 개인정보를 포함하지 않는다.

## 22. QA 필수 검증

- XLSX/XLS/CSV upload, multi-sheet, sheet 변경, header 변경·없음, preview 20행
- String/Date X, numeric Y, 1~5 Y series와 invalid column 차단
- Vertical/Horizontal Bar, Line, Pie, Donut, Area, Scatter의 값·label 정확성
- 추천 규칙, SUM/AVG/COUNT/MIN/MAX/none, 모든 sort, Top N
- empty/null/zero/negative/percentage/currency/date/formula cached value
- title/subtitle, legend, data label, axes, grid, 4 themes, background와 colors
- 1200×630, 1080×1080, 1920×1080, 1080×1920, custom size
- PNG/JPG/SVG, 1×/2×/3×의 MIME, decode 가능성, exact dimensions
- 파일 교체, sheet 교체, 세 종류 reset, 반복 export, 취소, cleanup
- 손상·암호화·과대 Excel과 malformed CSV에서 crash·unhandled rejection 없음
- 320/375/768/1440px에서 주요 흐름 완료, 페이지 전체 horizontal overflow 0
- ko/en/ja 직접 진입·새로고침·metadata, keyboard focus와 live message
- 정상·오류·대형 입력에서 Console Error 0

### Data Accuracy oracle

- `A=100, B=200, C=300`이 chart dataset과 renderer option에서 정확히 동일해야 한다.
- `서울 100, 서울 200`은 SUM=300, AVG=150, COUNT=2, MIN=100, MAX=200이다.
- missing은 0이 되지 않고 실제 0은 보존된다.
- Pie 음수는 차단된다.
- Excel `2026-09-01`은 timezone을 바꿔도 같은 calendar date다.
- round trip 가능한 export는 PNG/JPG pixel dimensions와 SVG viewBox를 독립 decoder/parser로 검사한다.

### Privacy oracle

- Playwright에서 `fetch`, XHR, WebSocket, EventSource, sendBeacon을 감시한다.
- 테스트 marker를 filename, sheet, cell, title에 넣고 network request body/URL/header, Storage API, history에서 marker가 0건인지 확인한다.
- 앱 자체 JS/CSS/font chunk 로드와 Naver 등 기존 사이트 공통 script 요청은 구분하되, marker 또는 파일 bytes가 실리면 즉시 Critical이다.

## 23. Critic 필수 사전 질문

Critic은 평가 전에 이 질문을 포함하여 최소 15개를 확정하고 답·근거·점수를 기록한다.

1. Excel을 모르는 사람도 업로드 후 어떤 열을 골라야 하는지 이해하는가?
2. 파일을 올리면 사용할 만한 기본 차트가 자동으로 보이는가?
3. 시트와 헤더 선택이 복잡하지 않고 자동 선택이 명확히 표시되는가?
4. X축/Y축을 모르는 사용자도 설명과 추천으로 완료할 수 있는가?
5. 추천이 틀려도 사용자가 쉽게 바꾸고 이유를 이해할 수 있는가?
6. 부적합하거나 오해를 부르는 Pie/Line/Scatter를 적절히 막거나 경고하는가?
7. 자동 변환이 null·0·date·percentage·currency를 왜곡하지 않는가?
8. 옵션이 Excel처럼 과도하게 보이지 않으면서 핵심 조정은 가능한가?
9. 정확한 이미지 크기와 scale의 차이를 이해하고 저장할 수 있는가?
10. 미리보기와 다운로드 결과의 비율·제목·범례·축 배치가 일치하는가?
11. 모바일 흐름이 지나치게 길거나 preview와 설정을 오가기 힘들지 않은가?
12. 민감한 업무 파일이 브라우저에서만 처리된다는 점을 업로드 전에 아는가?
13. 대형 파일에서 진행·취소·한도 안내가 신뢰를 주는가?
14. 결과 이미지가 발표자료·블로그에 바로 쓸 만큼 읽기 쉬운가?
15. 키보드·스크린리더 사용자가 데이터와 현재 차트 설정을 확인할 수 있는가?

Critic은 코드를 수정하거나 최종 승인하지 않는다.

## 24. 기능별 강화 평가

총 100점이며 `docs/EVALUATION.md`의 공통 100점표와 별도로 이 기능의 위험을 평가한다.

| 영역 | 배점 |
|---|---:|
| 데이터 파싱 정확성 | 20 |
| 차트 데이터 정확성 | 20 |
| Export 정확성 | 15 |
| UX | 15 |
| 차트 가독성·디자인 | 10 |
| 모바일 | 5 |
| 성능 | 5 |
| Privacy | 5 |
| 접근성 | 3 |
| 코드 품질 | 2 |

- 항목별로 충족=100%, 부분 충족=50%, 미충족/NOT TESTED=0%를 적용하고 관찰·테스트 근거를 남긴다.
- 기능별 점수 92점 이상이어야 한다. 공통 `docs/EVALUATION.md` 점수도 90점 이상이어야 한다.
- `Data Accuracy Critical`: 파싱·정규화·집계·차트 option이 원본 의미나 값을 실질적으로 바꾸는 문제
- `Export Critical`: 파일이 열리지 않음, 다른 chart/data가 저장됨, 요청 dimensions 불일치, 민감 데이터가 의도치 않게 포함·전송됨
- 더 높은 등급을 우선 적용한다.

## 25. 완료 조건과 개선 루프

다음을 모두 만족할 때만 Product Owner가 `DONE`으로 기록할 수 있다.

- 기능별 평가 92/100 이상 및 공통 평가 90/100 이상
- Data Accuracy Critical 0, Export Critical 0, 전체 Critical 0, High 0
- XLSX, XLS, UTF-8 CSV, CP949/EUC-KR CSV PASS
- sheet/header/preview/type inference/X·Y/다중 series PASS
- 7개 chart와 추천·집계·정렬·Top N PASS
- PNG/JPG/SVG 및 exact size·1×/2×/3× PASS
- date timezone, percentage, currency, null, 0, negative 정확성 PASS
- 대형·손상 파일 안정성 PASS
- 파일·셀 데이터 network/storage 전송 0
- 320/375/768/1440px PASS, Console Error 0
- lint, type-check, 전체 자동 test, build 모두 exit code 0이고 fail/skip/todo 0
- `ko`, `en`, `ja`, SEO, 접근성 검증 PASS

Builder는 구현만 하며 자기 결과물을 PASS/DONE 처리하지 않는다. Critic은 질문·점수·issue를 작성하되 코드를 수정하지 않는다. QA는 독립 oracle로 객관적 테스트와 evidence를 기록하고 코드를 수정하지 않는다. 평가 후 제품 코드와 테스트 수정은 Optimizer만 한다.

최초 구현 평가는 회차 0이다. 미달 시 Optimizer 개선은 최대 5회이며 매회 Critic 전체 재평가와 QA 전체 필수 검증을 다시 수행한다. 5회 후 하나라도 미달하거나 NOT TESTED이면 억지로 통과시키지 않고 `NEEDS HUMAN REVIEW`로 남긴다.

## 26. Architect 검토 결론

- **기존 구조 충돌 없음:** 독립 locale URL, Server page + 최소 Client subtree, `components/tools`와 `lib/tools` 분리 원칙을 따른다.
- **선택 라이브러리:** SheetJS CE(Excel), Papa Parse(CSV), Apache ECharts(chart). 모두 runtime CDN이 아닌 고정 local dependency로 사용한다.
- **지원 chart:** vertical/horizontal bar, line, pie, donut, area, scatter. 다중 series는 pie/donut/scatter를 제외한 적합 chart에 최대 5개다.
- **V1 범위:** 3개 입력 형식, 데이터 검토·추론·추천·집계, 7개 chart, 핵심 디자인, 정확한 PNG/JPG/SVG export까지다.
- **성능 위험:** Excel parse, structured clone, 100k행 aggregation, 고해상도 raster, 지나친 point 수다. Worker, transferable, materialization/point/pixel limit, dynamic import로 통제한다.
- **parser 한계:** formula를 계산하지 않고 cached result만 사용한다. 암호화, macro 실행, 완전한 Excel format/merge 의미, date/timezone 의미 복원은 보장하지 않는다.
- **export:** 동일 `ChartScene`을 preview와 detached Canvas/SVG renderer가 공유한다. raster는 decode 후 exact dimensions를 검사한다.
- **확장성:** 모든 source adapter가 `NormalizedTable`을 반환하므로 TSV/Clipboard/JSON은 chart/aggregation/export를 바꾸지 않고 추가할 수 있다.
- **라이선스 조치:** 구현 시 SheetJS CE와 ECharts Apache-2.0, Papa Parse MIT 고지와 실제 선택 버전을 기록한다.
- **Builder 인계 가능:** 입력·오류·상태·모델·한도·폴더·QA oracle·완료 기준이 정해졌으므로 별도 범위 결정 없이 구현을 시작할 수 있다.

구현 결과는 `PROGRESS.md`의 2026-09-02 기록에 연결한다.
