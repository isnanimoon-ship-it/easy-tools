import {
  Binary,
  Braces,
  CalendarClock,
  Crop,
  FileKey,
  FileText,
  Globe2,
  ImageDown,
  ImageIcon,
  Images,
  Link2,
  Palette,
  QrCode,
  Regex,
  ShieldAlert,
  WholeWord,
  type LucideIcon,
} from "lucide-react";

export const TOOL_CATEGORY_KEYS = ["text", "developer", "media", "other"] as const;
export type ToolCategoryKey = (typeof TOOL_CATEGORY_KEYS)[number];

export type ToolDefinition = {
  path: `/tools/${string}`;
  translationKey: string;
  category: ToolCategoryKey;
  icon: LucideIcon;
  homeOrder: number;
  menuOrder: number;
};

/**
 * 도구의 단일 등록 지점입니다.
 * 새 도구를 이 배열에 한 번 추가하면 홈 카드, 도구 메뉴, 사이트맵에 함께 반영됩니다.
 */
export const TOOLS = [
  { path: "/tools/word-counter", translationKey: "wordCounter", category: "text", icon: FileText, homeOrder: 1, menuOrder: 1 },
  { path: "/tools/json-formatter", translationKey: "jsonFormatter", category: "developer", icon: Braces, homeOrder: 2, menuOrder: 1 },
  { path: "/tools/password-generator", translationKey: "passwordGenerator", category: "other", icon: FileKey, homeOrder: 3, menuOrder: 1 },
  { path: "/tools/base64-converter", translationKey: "base64Converter", category: "developer", icon: Binary, homeOrder: 4, menuOrder: 2 },
  { path: "/tools/url-encoder-decoder", translationKey: "urlEncoderDecoder", category: "developer", icon: Link2, homeOrder: 5, menuOrder: 3 },
  { path: "/tools/youtube-thumbnail-downloader", translationKey: "youtubeThumbnailDownloader", category: "media", icon: ImageIcon, homeOrder: 6, menuOrder: 4 },
  { path: "/tools/qr-code-generator", translationKey: "qrCodeGenerator", category: "developer", icon: QrCode, homeOrder: 7, menuOrder: 6 },
  { path: "/tools/ip-info", translationKey: "ipInfo", category: "other", icon: Globe2, homeOrder: 8, menuOrder: 2 },
  { path: "/tools/image-color-picker", translationKey: "imageColorPicker", category: "media", icon: Palette, homeOrder: 9, menuOrder: 3 },
  { path: "/tools/image-compressor", translationKey: "imageCompressor", category: "media", icon: ImageDown, homeOrder: 10, menuOrder: 2 },
  { path: "/tools/screenshot-stitcher", translationKey: "screenshotStitcher", category: "media", icon: Images, homeOrder: 11, menuOrder: 1 },
  { path: "/tools/regex-tester", translationKey: "regexTester", category: "developer", icon: Regex, homeOrder: 12, menuOrder: 4 },
  { path: "/tools/cron-expression-generator", translationKey: "cronExpressionGenerator", category: "developer", icon: CalendarClock, homeOrder: 13, menuOrder: 5 },
  { path: "/tools/privacy-redactor", translationKey: "privacyRedactor", category: "media", icon: ShieldAlert, homeOrder: 14, menuOrder: 5 },
  { path: "/tools/screenshot-statusbar-remover", translationKey: "screenshotStatusbarRemover", category: "media", icon: Crop, homeOrder: 15, menuOrder: 6 },
  { path: "/tools/text-cleaner", translationKey: "textCleaner", category: "text", icon: WholeWord, homeOrder: 16, menuOrder: 2 },
] as const satisfies readonly ToolDefinition[];

export type ToolPath = (typeof TOOLS)[number]["path"];

export const HOME_TOOLS = [...TOOLS].sort((a, b) => a.homeOrder - b.homeOrder);

export function toolsInCategory(category: ToolCategoryKey) {
  return TOOLS.filter(tool => tool.category === category).sort((a, b) => a.menuOrder - b.menuOrder);
}
