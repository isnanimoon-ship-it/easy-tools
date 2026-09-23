import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { InlineShareBar } from "@/components/layout/share-bar";
import { AnimatedGifMaker } from "@/components/tools/animated-gif/animated-gif-maker";
import { ToolPageHero } from "@/components/tools/shared/tool-page-hero";
import { routing, type AppLocale } from "@/i18n/routing";
import { createPageMetadata } from "@/lib/seo";

const path = "/tools/animated-gif-maker" as const;
type Props = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Tools.animatedGifMaker.metadata" });
  return createPageMetadata({ locale, title: t("title"), description: t("description"), pathname: `/${locale}${path}` });
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Tools.animatedGifMaker");
  const common = await getTranslations("Common");
  return <>
    <ToolPageHero locale={locale} title={t("title")} description={t("description")} homeLabel={common("homeLabel")} category={{ key: "image", label: common("toolsNav.categories.image") }} tool={{ path, label: common("toolsNav.animatedGifMaker") }}/>
    <Container className="py-8 sm:py-12"><AnimatedGifMaker/><InlineShareBar/><GifGuide locale={locale}/></Container>
  </>;
}

function GifGuide({ locale }: { locale: AppLocale }) {
  const c = GUIDE[locale];
  return <div className="mt-12 space-y-12 border-t border-[var(--border)] pt-12 sm:mt-16 sm:pt-16">
    <section><h2 className="text-2xl font-bold">{c.whatTitle}</h2><p className="mt-4 max-w-4xl leading-7 text-[var(--text-muted)]">{c.what}</p></section>
    <section><h2 className="text-2xl font-bold">{c.howTitle}</h2><ol className="mt-5 grid gap-4 sm:grid-cols-3">{c.steps.map((step, index) => <li key={step[0]} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><span className="text-sm font-bold text-[var(--primary)]">STEP {index + 1}</span><h3 className="mt-2 font-bold">{step[0]}</h3><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{step[1]}</p></li>)}</ol></section>
    <section><h2 className="text-2xl font-bold">{c.rulesTitle}</h2><ul className="mt-4 list-disc space-y-2 pl-5 leading-7 text-[var(--text-muted)]">{c.rules.map(item => <li key={item}>{item}</li>)}</ul></section>
    <section className="rounded-2xl border border-[var(--info-border)] bg-[var(--info-bg)] p-5 sm:p-7"><h2 className="text-xl font-bold text-[var(--info-fg)]">{c.privacyTitle}</h2><p className="mt-2 leading-7 text-[var(--info-fg)]">{c.privacy}</p></section>
    <section><h2 className="text-2xl font-bold">{c.faqTitle}</h2><div className="mt-5 space-y-3">{c.faqs.map(([question, answer]) => <details key={question} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><summary className="cursor-pointer font-bold">{question}</summary><p className="mt-3 leading-7 text-[var(--text-muted)]">{answer}</p></details>)}</div></section>
  </div>;
}

const GUIDE = {
  ko: { whatTitle: "애니메이션 GIF 생성기는 무엇을 하나요?", what: "여러 정지 이미지를 지정한 순서와 시간 간격으로 재생되는 하나의 GIF 파일로 만듭니다. 별도 영상 편집 프로그램 없이 제품 변화, 작업 과정, 비교 이미지나 간단한 안내 애니메이션을 만들 때 사용할 수 있습니다.", howTitle: "사용 방법", steps: [["이미지 추가", "JPG, PNG 또는 WebP 이미지를 2장 이상 선택합니다."], ["순서와 화면 설정", "프레임 순서·표시 시간과 출력 크기, 맞춤 방식, 색상 수를 조절합니다."], ["생성 및 저장", "GIF 만들기를 누르고 미리보기에서 재생을 확인한 뒤 다운로드합니다."]], rulesTitle: "처리 기준과 제한사항", rules: ["입력 이미지의 크기가 다르면 모든 프레임을 같은 출력 크기로 맞춥니다. 전체 표시는 여백을 만들고, 가득 채우기는 가장자리를 자를 수 있습니다.", "각 프레임의 시간은 20~10,000ms이며 GIF 형식에 맞춰 10ms 단위로 저장됩니다.", "GIF는 프레임당 최대 256색만 표현합니다. 사진이나 부드러운 그러데이션은 색 띠나 점이 보일 수 있습니다.", "투명 배경 출력은 지원하지 않습니다. PNG의 투명 영역에는 선택한 배경색이 적용됩니다.", "움직이는 GIF·WebP 안의 기존 프레임을 추출하지 않으며 정지 이미지 입력만 지원합니다."], privacyTitle: "브라우저에서만 처리", privacy: "선택한 이미지와 생성된 GIF는 현재 브라우저 탭의 메모리에서만 처리됩니다. 파일 내용이나 파일명은 서버 또는 외부 API로 전송하거나 브라우저 저장소에 보관하지 않습니다.", faqTitle: "자주 묻는 질문", faqs: [["GIF가 원본 사진보다 흐리거나 색이 다른 이유는 무엇인가요?", "GIF의 256색 제한으로 각 프레임을 감색하기 때문입니다. 사진은 256색을 선택하고 출력 크기를 너무 크게 만들지 않는 편이 좋습니다."], ["프레임마다 표시 시간을 다르게 설정할 수 있나요?", "네. 이미지 목록에서 각 프레임의 시간을 밀리초(ms) 단위로 입력할 수 있습니다."], ["서로 다른 크기의 사진도 사용할 수 있나요?", "가능합니다. 전체 표시를 선택하면 여백과 함께 모두 보이고, 가득 채우기를 선택하면 출력 영역을 채우는 대신 일부가 잘릴 수 있습니다."], ["완성된 GIF가 너무 크면 어떻게 하나요?", "출력 가로·세로, 프레임 수, 색상 수를 줄이거나 프레임 표시 시간을 늘려 필요한 장면 수를 줄여보세요."]] },
  en: { whatTitle: "What does the animated GIF maker do?", what: "Combine still images into one GIF that plays them in a chosen order and at chosen intervals. It is useful for simple before-and-after sequences, product changes, process steps, and short visual instructions.", howTitle: "How to use it", steps: [["Add images", "Choose at least two JPG, PNG, or WebP still images."], ["Arrange and configure", "Set frame order and timing, output size, fit mode, and color count."], ["Create and save", "Create the GIF, check playback in the preview, and download it."]], rulesTitle: "Processing rules and limitations", rules: ["All frames use one output size. Fit adds padding; Fill can crop image edges.", "Frame durations range from 20 to 10,000 ms and are stored in 10 ms GIF increments.", "GIF supports up to 256 colors per frame, so photos and gradients can show banding.", "Transparent output is not supported; transparent source areas use the chosen background color.", "Existing frames are not extracted from animated GIF or WebP files."], privacyTitle: "Processed in your browser", privacy: "Selected images and the generated GIF remain in the current browser tab. File content and names are not sent to a server, external API, or browser storage.", faqTitle: "Frequently asked questions", faqs: [["Why do colors differ from the source images?", "GIF is limited to 256 colors per frame. Choose 256 colors and a moderate output size for photographs."], ["Can each frame have a different duration?", "Yes. Enter a duration in milliseconds for every image in the frame list."], ["Can I mix images with different dimensions?", "Yes. Fit shows the whole image with padding, while Fill covers the output and may crop edges."], ["How can I reduce the GIF file size?", "Reduce output dimensions, frame count, or color count, and remove frames that do not add useful motion."]] },
  ja: { whatTitle: "アニメーションGIF作成ツールとは？", what: "複数の静止画像を指定した順番と間隔で再生する1つのGIFにまとめます。ビフォーアフター、作業手順、商品の変化、短い案内画像に利用できます。", howTitle: "使い方", steps: [["画像を追加", "JPG、PNG、WebPの静止画像を2枚以上選択します。"], ["順番と設定", "フレーム順、表示時間、出力サイズ、配置、色数を調整します。"], ["作成して保存", "GIFを作成し、プレビューで再生を確認してダウンロードします。"]], rulesTitle: "処理方法と制限", rules: ["すべてのフレームは同じ出力サイズになります。全体表示では余白ができ、全面表示では端が切れる場合があります。", "表示時間は20～10,000msで、GIFでは10ms単位で保存されます。", "GIFは1フレーム最大256色のため、写真やグラデーションに色の段差が出る場合があります。", "透明出力には対応せず、透明部分には選択した背景色を使用します。", "アニメーションGIF・WebP内の既存フレームは抽出しません。"], privacyTitle: "ブラウザー内で処理", privacy: "画像と生成したGIFは現在のブラウザータブ内だけで処理されます。ファイル内容や名前をサーバー、外部API、ブラウザー保存領域へ送信・保存しません。", faqTitle: "よくある質問", faqs: [["元画像と色が違うのはなぜですか？", "GIFは1フレーム256色までのためです。写真では256色と適度な出力サイズを選んでください。"], ["画像ごとに表示時間を変えられますか？", "はい。フレーム一覧で各画像の時間をミリ秒単位で設定できます。"], ["大きさが違う画像も使えますか？", "使えます。全体表示は余白を付け、全面表示は端を切り抜いて出力領域を埋めます。"], ["GIFの容量を減らすには？", "出力サイズ、フレーム数、色数を減らしてください。"]] },
} as const;

