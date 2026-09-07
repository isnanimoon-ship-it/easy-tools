import type { ToolPath } from "@/lib/tools/registry";

export type DetailToolPath =
  | "/tools/base64-converter"
  | "/tools/cron-expression-generator"
  | "/tools/excel-chart-maker"
  | "/tools/favicon-generator"
  | "/tools/image-color-picker"
  | "/tools/json-formatter"
  | "/tools/image-compressor"
  | "/tools/ip-info"
  | "/tools/jwt-decoder"
  | "/tools/korean-initial-converter"
  | "/tools/password-generator"
  | "/tools/privacy-redactor"
  | "/tools/qr-code-generator"
  | "/tools/regex-tester"
  | "/tools/screenshot-statusbar-remover"
  | "/tools/screenshot-stitcher"
  | "/tools/sql-formatter"
  | "/tools/text-cleaner"
  | "/tools/url-encoder-decoder"
  | "/tools/word-counter"
  | "/tools/youtube-thumbnail-downloader";

type ToolDetailConfig = {
  namespace: string;
  related: readonly ToolPath[];
  popular: readonly ToolPath[];
};

export const TOOL_DETAIL_CONFIG = {
  "/tools/base64-converter": { namespace: "base64Converter", related: ["/tools/url-encoder-decoder", "/tools/json-formatter", "/tools/jwt-decoder"], popular: ["/tools/image-compressor", "/tools/qr-code-generator", "/tools/word-counter"] },
  "/tools/cron-expression-generator": { namespace: "cronExpressionGenerator", related: ["/tools/regex-tester", "/tools/json-formatter", "/tools/sql-formatter"], popular: ["/tools/image-compressor", "/tools/qr-code-generator", "/tools/word-counter"] },
  "/tools/excel-chart-maker": { namespace: "excelChartMaker", related: ["/tools/json-formatter", "/tools/sql-formatter", "/tools/image-compressor"], popular: ["/tools/qr-code-generator", "/tools/word-counter", "/tools/password-generator"] },
  "/tools/favicon-generator": { namespace: "faviconGenerator", related: ["/tools/image-color-picker", "/tools/image-compressor", "/tools/qr-code-generator"], popular: ["/tools/json-formatter", "/tools/word-counter", "/tools/password-generator"] },
  "/tools/image-color-picker": { namespace: "imageColorPicker", related: ["/tools/image-compressor", "/tools/favicon-generator", "/tools/screenshot-stitcher"], popular: ["/tools/qr-code-generator", "/tools/json-formatter", "/tools/word-counter"] },
  "/tools/json-formatter": {
    namespace: "jsonFormatter",
    related: ["/tools/sql-formatter", "/tools/base64-converter", "/tools/url-encoder-decoder"],
    popular: ["/tools/image-compressor", "/tools/qr-code-generator", "/tools/word-counter"],
  },
  "/tools/image-compressor": {
    namespace: "imageCompressor",
    related: ["/tools/image-color-picker", "/tools/favicon-generator", "/tools/screenshot-stitcher"],
    popular: ["/tools/qr-code-generator", "/tools/json-formatter", "/tools/word-counter"],
  },
  "/tools/ip-info": { namespace: "ipInfo", related: ["/tools/url-encoder-decoder", "/tools/json-formatter", "/tools/qr-code-generator"], popular: ["/tools/image-compressor", "/tools/word-counter", "/tools/password-generator"] },
  "/tools/jwt-decoder": { namespace: "jwtDecoder", related: ["/tools/base64-converter", "/tools/json-formatter", "/tools/url-encoder-decoder", "/tools/regex-tester"], popular: ["/tools/password-generator", "/tools/qr-code-generator", "/tools/word-counter"] },
  "/tools/korean-initial-converter": { namespace: "koreanInitialConverter", related: ["/tools/word-counter", "/tools/text-cleaner", "/tools/regex-tester"], popular: ["/tools/image-compressor", "/tools/json-formatter", "/tools/qr-code-generator"] },
  "/tools/password-generator": { namespace: "passwordGenerator", related: ["/tools/jwt-decoder", "/tools/qr-code-generator", "/tools/word-counter"], popular: ["/tools/image-compressor", "/tools/json-formatter", "/tools/url-encoder-decoder"] },
  "/tools/privacy-redactor": { namespace: "privacyRedactor", related: ["/tools/screenshot-statusbar-remover", "/tools/image-compressor", "/tools/screenshot-stitcher", "/tools/image-color-picker"], popular: ["/tools/qr-code-generator", "/tools/json-formatter", "/tools/word-counter"] },
  "/tools/qr-code-generator": { namespace: "qrCodeGenerator", related: ["/tools/url-encoder-decoder", "/tools/image-color-picker", "/tools/favicon-generator"], popular: ["/tools/image-compressor", "/tools/json-formatter", "/tools/password-generator"] },
  "/tools/regex-tester": { namespace: "regexTester", related: ["/tools/text-cleaner", "/tools/json-formatter", "/tools/url-encoder-decoder", "/tools/cron-expression-generator"], popular: ["/tools/image-compressor", "/tools/word-counter", "/tools/password-generator"] },
  "/tools/screenshot-statusbar-remover": { namespace: "screenshotStatusbarRemover", related: ["/tools/privacy-redactor", "/tools/screenshot-stitcher", "/tools/image-compressor"], popular: ["/tools/qr-code-generator", "/tools/json-formatter", "/tools/word-counter"] },
  "/tools/screenshot-stitcher": { namespace: "screenshotStitcher", related: ["/tools/screenshot-statusbar-remover", "/tools/privacy-redactor", "/tools/image-compressor"], popular: ["/tools/qr-code-generator", "/tools/json-formatter", "/tools/word-counter"] },
  "/tools/sql-formatter": { namespace: "sqlFormatter", related: ["/tools/json-formatter", "/tools/regex-tester", "/tools/excel-chart-maker"], popular: ["/tools/image-compressor", "/tools/qr-code-generator", "/tools/word-counter"] },
  "/tools/text-cleaner": { namespace: "textCleaner", related: ["/tools/word-counter", "/tools/korean-initial-converter", "/tools/regex-tester"], popular: ["/tools/image-compressor", "/tools/json-formatter", "/tools/qr-code-generator"] },
  "/tools/url-encoder-decoder": { namespace: "urlEncoderDecoder", related: ["/tools/base64-converter", "/tools/json-formatter", "/tools/qr-code-generator"], popular: ["/tools/image-compressor", "/tools/word-counter", "/tools/password-generator"] },
  "/tools/word-counter": {
    namespace: "wordCounter",
    related: ["/tools/text-cleaner", "/tools/korean-initial-converter", "/tools/regex-tester"],
    popular: ["/tools/image-compressor", "/tools/json-formatter", "/tools/qr-code-generator"],
  },
  "/tools/youtube-thumbnail-downloader": { namespace: "youtubeThumbnailDownloader", related: ["/tools/image-compressor", "/tools/image-color-picker", "/tools/qr-code-generator"], popular: ["/tools/json-formatter", "/tools/word-counter", "/tools/password-generator"] },
} as const satisfies Record<DetailToolPath, ToolDetailConfig>;
