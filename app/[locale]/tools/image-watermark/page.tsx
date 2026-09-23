import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { InlineShareBar } from "@/components/layout/share-bar";
import { ImageWatermark } from "@/components/tools/image-watermark/image-watermark";
import { ToolPageHero } from "@/components/tools/shared/tool-page-hero";
import { routing, type AppLocale } from "@/i18n/routing";
import { createPageMetadata } from "@/lib/seo";

const path = "/tools/image-watermark" as const;
type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params; if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Tools.imageWatermark.metadata" });
  return createPageMetadata({ locale, title: t("title"), description: t("description"), pathname: `/${locale}${path}` });
}

export default async function Page({ params }: Props) {
  const { locale } = await params; if (!hasLocale(routing.locales, locale)) notFound(); setRequestLocale(locale);
  const t = await getTranslations("Tools.imageWatermark"); const common = await getTranslations("Common");
  return <><ToolPageHero locale={locale} title={t("title")} description={t("description")} homeLabel={common("homeLabel")} category={{ key: "image", label: common("toolsNav.categories.image") }} tool={{ path, label: common("toolsNav.imageWatermark") }}/><Container className="py-8 sm:py-12"><ImageWatermark/><InlineShareBar/><WatermarkGuide locale={locale}/></Container></>;
}

function WatermarkGuide({ locale }: { locale: AppLocale }) {
  const c = GUIDE[locale];
  return <div className="mt-12 space-y-12">
    <section><h2 className="text-2xl font-bold text-[var(--foreground)]">{c.whatTitle}</h2><p className="mt-4 max-w-4xl leading-7 text-[var(--text-muted)]">{c.what}</p></section>
    <section><h2 className="text-2xl font-bold text-[var(--foreground)]">{c.howTitle}</h2><ol className="mt-5 grid gap-4 sm:grid-cols-3">{c.steps.map((step, index) => <li key={step[0]} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><span className="text-sm font-bold text-[var(--primary)]">STEP {index + 1}</span><h3 className="mt-2 font-bold text-[var(--foreground)]">{step[0]}</h3><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{step[1]}</p></li>)}</ol></section>
    <section><h2 className="text-2xl font-bold text-[var(--foreground)]">{c.rulesTitle}</h2><ul className="mt-4 list-disc space-y-2 pl-5 leading-7 text-[var(--text-muted)]">{c.rules.map(item => <li key={item}>{item}</li>)}</ul></section>
    <section><h2 className="text-2xl font-bold text-[var(--foreground)]">{c.privacyTitle}</h2><p className="mt-4 max-w-4xl leading-7 text-[var(--text-muted)]">{c.privacy}</p></section>
    <section><h2 className="text-2xl font-bold text-[var(--foreground)]">{c.faqTitle}</h2><div className="mt-5 space-y-3">{c.faqs.map(([question, answer]) => <details key={question} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><summary className="cursor-pointer font-bold text-[var(--foreground)]">{question}</summary><p className="mt-3 leading-7 text-[var(--text-muted)]">{answer}</p></details>)}</div></section>
  </div>;
}

const GUIDE = {
  ko: { whatTitle: "이미지 워터마크는 무엇을 하나요?", what: "사진이나 작업 이미지에 저작자명, 계정명, 상호 또는 로고를 겹쳐 표시합니다. 한 곳에 배치하거나 이미지 전체에 반복할 수 있으며 원본 파일을 변경하지 않고 새 파일을 만듭니다.", howTitle: "사용 방법", steps: [["원본 이미지 선택", "JPG, PNG 또는 WebP 이미지 한 장을 선택합니다."], ["워터마크 설정", "텍스트나 로고를 고르고 크기, 위치, 불투명도와 회전을 조절합니다."], ["적용 및 다운로드", "미리보기를 확인하고 적용한 뒤 원본 해상도의 결과를 내려받습니다."]], rulesTitle: "처리 기준과 제한사항", rules: ["정적 JPG, PNG, WebP를 지원하며 움직이는 이미지는 지원하지 않습니다.", "출력 과정에서 이미지가 다시 인코딩되므로 파일 크기와 화질이 달라질 수 있습니다.", "Canvas 처리로 EXIF, GPS, 촬영 시각과 색상 프로필 등 메타데이터가 제거되거나 달라질 수 있습니다.", "시스템 글꼴은 운영체제에 따라 모양이 조금 다를 수 있습니다.", "워터마크는 무단 사용을 어렵게 만들 수 있지만 저작권 보호를 완전히 보장하지 않습니다."], privacyTitle: "개인정보와 브라우저 처리", privacy: "원본 이미지, 로고, 워터마크 문구와 결과 파일은 현재 브라우저에서만 처리됩니다. 파일 내용과 설정은 서버나 외부 API, 브라우저 저장소로 전송·저장하지 않습니다.", faqTitle: "자주 묻는 질문", faqs: [["투명 로고를 사용할 수 있나요?", "네. 투명 PNG 또는 WebP를 사용하면 투명 영역을 유지할 수 있습니다."], ["원본 이미지가 수정되나요?", "아니요. 원본은 그대로 두고 워터마크가 적용된 새 이미지 파일을 만듭니다."], ["반복 워터마크는 어떻게 사용하나요?", "반복해서 채우기를 켜고 회전과 간격을 조절하면 이미지 전체에 같은 워터마크가 배치됩니다."], ["사진의 EXIF 정보도 유지되나요?", "보장하지 않습니다. Canvas로 새 이미지를 만들면서 EXIF와 GPS 등의 메타데이터가 제거되거나 달라질 수 있습니다."]] },
  en: { whatTitle: "What does the watermark tool do?", what: "Overlay a creator name, account, business name, or logo on an image. Place it once or tile it across the image, then export a new file without changing the source.", howTitle: "How to use it", steps: [["Choose a source", "Select one JPG, PNG, or WebP image."], ["Configure the watermark", "Choose text or a logo, then adjust size, position, opacity, and rotation."], ["Apply and download", "Review the preview, render at the source resolution, and download the result."]], rulesTitle: "Processing rules and limitations", rules: ["Still JPG, PNG, and WebP images are supported; animations are not.", "Exporting re-encodes the image, so file size and visual quality can change.", "EXIF, GPS, capture time, and color-profile metadata may be removed or changed by Canvas export.", "System fonts can look slightly different across operating systems.", "A watermark can discourage reuse but cannot guarantee copyright protection."], privacyTitle: "Privacy and browser processing", privacy: "The source, logo, text, settings, and result stay in the current browser tab. File contents are not sent to a server, external API, or browser storage.", faqTitle: "Frequently asked questions", faqs: [["Can I use a transparent logo?", "Yes. Use a transparent PNG or WebP to preserve transparent areas."], ["Does this modify the original?", "No. It creates a separate watermarked file."], ["How does tiling work?", "Enable tiling and adjust rotation and spacing to cover the image."], ["Is EXIF metadata preserved?", "It is not guaranteed. Canvas export may remove or change EXIF, GPS, and related metadata."]] },
  ja: { whatTitle: "画像ウォーターマークとは？", what: "画像に作成者名、アカウント名、店舗名、ロゴを重ねます。1か所または画像全体に繰り返して配置し、元画像を変更せず新しいファイルを作成します。", howTitle: "使い方", steps: [["元画像を選択", "JPG、PNG、WebP画像を1枚選択します。"], ["ウォーターマークを設定", "テキストまたはロゴを選び、サイズ、位置、透明度、回転を調整します。"], ["適用して保存", "プレビューを確認し、元の解像度で作成した結果を保存します。"]], rulesTitle: "処理基準と制限", rules: ["静止JPG、PNG、WebPに対応し、アニメーションには対応しません。", "出力時に再エンコードされるため、容量や画質が変わる場合があります。", "Canvas出力によりEXIF、GPS、撮影日時、カラープロファイルが削除・変更される場合があります。", "システムフォントはOSによって見た目が多少異なります。", "ウォーターマークは無断利用を防ぐ絶対的な保証ではありません。"], privacyTitle: "プライバシーとブラウザ処理", privacy: "元画像、ロゴ、文字、設定、結果は現在のブラウザ内だけで処理されます。ファイル内容をサーバー、外部API、ブラウザストレージへ送信・保存しません。", faqTitle: "よくある質問", faqs: [["透過ロゴを使えますか？", "はい。透過PNGまたはWebPを使うと透明部分を維持できます。"], ["元画像は変更されますか？", "いいえ。ウォーターマーク入りの別ファイルを作成します。"], ["繰り返し配置とは？", "繰り返しを有効にし、回転と間隔を調整すると画像全体に配置できます。"], ["EXIFは保持されますか？", "保証されません。Canvas出力でEXIFやGPSなどが削除・変更される場合があります。"]] },
} as const;
