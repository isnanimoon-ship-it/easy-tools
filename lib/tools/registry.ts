import {
  AppWindow,
  BarChart3,
  Binary,
  Braces,
  CalendarClock,
  Crop,
  Database,
  FileKey,
  FileText,
  Film,
  BookOpenText,
  FileSearch,
  Files,
  Globe2,
  ImageDown,
  ImageIcon,
  FileImage,
  ScanSearch,
  Images,
  KeyRound,
  Keyboard,
  Link2,
  Palette,
  QrCode,
  Regex,
  ShieldAlert,
  Type,
  WholeWord,
  type LucideIcon,
} from "lucide-react";
import type { AppLocale } from "@/i18n/routing";

export const TOOL_CATEGORY_KEYS = ["image", "text", "developer", "generator", "fileData", "network"] as const;
export type ToolCategoryKey = (typeof TOOL_CATEGORY_KEYS)[number];

export type ToolDefinition = {
  path: `/tools/${string}`;
  translationKey: string;
  category: ToolCategoryKey;
  icon: LucideIcon;
  homeOrder: number;
  menuOrder: number;
  visibility?: "hidden";
  locales?: readonly AppLocale[];
  detailMode?: "inline";
};

/**
 * 도구의 단일 등록 지점입니다.
 * 새 도구를 이 배열에 한 번 추가하면 홈 카드, 도구 메뉴, 사이트맵에 함께 반영됩니다.
 */
export const TOOLS = [
  { path: "/tools/word-counter", translationKey: "wordCounter", category: "text", icon: FileText, homeOrder: 1, menuOrder: 1 },
  { path: "/tools/json-formatter", translationKey: "jsonFormatter", category: "developer", icon: Braces, homeOrder: 2, menuOrder: 1 },
  { path: "/tools/password-generator", translationKey: "passwordGenerator", category: "generator", icon: FileKey, homeOrder: 3, menuOrder: 1 },
  { path: "/tools/base64-converter", translationKey: "base64Converter", category: "developer", icon: Binary, homeOrder: 4, menuOrder: 2 },
  { path: "/tools/url-encoder-decoder", translationKey: "urlEncoderDecoder", category: "developer", icon: Link2, homeOrder: 5, menuOrder: 3 },
  { path: "/tools/youtube-thumbnail-downloader", translationKey: "youtubeThumbnailDownloader", category: "image", icon: ImageIcon, homeOrder: 6, menuOrder: 4 },
  { path: "/tools/qr-code-generator", translationKey: "qrCodeGenerator", category: "generator", icon: QrCode, homeOrder: 7, menuOrder: 2 },
  { path: "/tools/ip-info", translationKey: "ipInfo", category: "network", icon: Globe2, homeOrder: 8, menuOrder: 1 },
  { path: "/tools/image-color-picker", translationKey: "imageColorPicker", category: "image", icon: Palette, homeOrder: 9, menuOrder: 3 },
  { path: "/tools/image-compressor", translationKey: "imageCompressor", category: "image", icon: ImageDown, homeOrder: 10, menuOrder: 2 },
  { path: "/tools/screenshot-stitcher", translationKey: "screenshotStitcher", category: "image", icon: Images, homeOrder: 11, menuOrder: 1 },
  { path: "/tools/regex-tester", translationKey: "regexTester", category: "developer", icon: Regex, homeOrder: 12, menuOrder: 4 },
  { path: "/tools/cron-expression-generator", translationKey: "cronExpressionGenerator", category: "developer", icon: CalendarClock, homeOrder: 13, menuOrder: 5 },
  { path: "/tools/privacy-redactor", translationKey: "privacyRedactor", category: "image", icon: ShieldAlert, homeOrder: 14, menuOrder: 5 },
  { path: "/tools/screenshot-statusbar-remover", translationKey: "screenshotStatusbarRemover", category: "image", icon: Crop, homeOrder: 15, menuOrder: 6 },
  { path: "/tools/text-cleaner", translationKey: "textCleaner", category: "text", icon: WholeWord, homeOrder: 16, menuOrder: 2 },
  { path: "/tools/korean-initial-converter", translationKey: "koreanInitialConverter", category: "text", icon: Type, homeOrder: 17, menuOrder: 3 },
  { path: "/tools/jwt-decoder", translationKey: "jwtDecoder", category: "developer", icon: KeyRound, homeOrder: 18, menuOrder: 7 },
  { path: "/tools/favicon-generator", translationKey: "faviconGenerator", category: "image", icon: AppWindow, homeOrder: 19, menuOrder: 7 },
  { path: "/tools/sql-formatter", translationKey: "sqlFormatter", category: "developer", icon: Database, homeOrder: 20, menuOrder: 8 },
  { path: "/tools/excel-chart-maker", translationKey: "excelChartMaker", category: "fileData", icon: BarChart3, homeOrder: 21, menuOrder: 1 },
  { path: "/tools/hwp-hwpx-viewer", translationKey: "hwpHwpxViewer", category: "fileData", icon: FileSearch, homeOrder: 22, menuOrder: 2 },
  { path: "/tools/markdown-viewer", translationKey: "markdownViewer", category: "text", icon: BookOpenText, homeOrder: 23, menuOrder: 4 },
  { path: "/tools/image-metadata-remover", translationKey: "imageMetadataRemover", category: "image", icon: ScanSearch, homeOrder: 24, menuOrder: 8 },
  { path: "/tools/image-to-pdf", translationKey: "imageToPdf", category: "image", icon: FileImage, homeOrder: 26, menuOrder: 9 },
  { path: "/tools/korean-keyboard-converter", translationKey: "koreanKeyboardConverter", category: "text", icon: Keyboard, homeOrder: 27, menuOrder: 5, locales: ["ko"] },
  { path: "/tools/image-watermark", translationKey: "imageWatermark", category: "image", icon: Images, homeOrder: 28, menuOrder: 10, detailMode: "inline" },
  { path: "/tools/animated-gif-maker", translationKey: "animatedGifMaker", category: "image", icon: Film, homeOrder: 29, menuOrder: 11, detailMode: "inline" },
  { path: "/tools/p2p-file-transfer", translationKey: "p2pFileTransfer", category: "fileData", icon: Files, homeOrder: 25, menuOrder: 3, visibility: "hidden" },
] as const satisfies readonly ToolDefinition[];

export type ToolPath = (typeof TOOLS)[number]["path"];

function isPublicTool(tool: ToolDefinition) { return tool.visibility !== "hidden"; }

export const PUBLIC_TOOLS = TOOLS.filter(isPublicTool);
export const HOME_TOOLS = [...PUBLIC_TOOLS].filter(tool => !("locales" in tool)).sort((a, b) => a.homeOrder - b.homeOrder);

export function publicToolsForLocale(locale: AppLocale) {
  return PUBLIC_TOOLS.filter(tool => !("locales" in tool) || (tool.locales as readonly AppLocale[]).includes(locale));
}

export function homeToolsForLocale(locale: AppLocale) {
  return [...publicToolsForLocale(locale)].sort((a, b) => a.homeOrder - b.homeOrder);
}

export function toolsInCategory(category: ToolCategoryKey, locale?: AppLocale) {
  const tools = locale ? publicToolsForLocale(locale) : PUBLIC_TOOLS;
  return tools.filter(tool => tool.category === category).sort((a, b) => a.menuOrder - b.menuOrder);
}
