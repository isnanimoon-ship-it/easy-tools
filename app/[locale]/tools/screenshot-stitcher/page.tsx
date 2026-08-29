import type{Metadata}from"next";
import{hasLocale}from"next-intl";
import{getTranslations,setRequestLocale}from"next-intl/server";
import{notFound}from"next/navigation";
import{Container}from"@/components/layout/container";
import{ScreenshotStitcher}from"@/components/tools/screenshot-stitcher/screenshot-stitcher";
import{routing}from"@/i18n/routing";
import{createPageMetadata}from"@/lib/seo";
type PageProps={params:Promise<{locale:string}>};
export async function generateMetadata({params}:PageProps):Promise<Metadata>{const{locale}=await params;if(!hasLocale(routing.locales,locale))notFound();const t=await getTranslations({locale,namespace:"Tools.screenshotStitcher.metadata"});return createPageMetadata({locale,title:t("title"),description:t("description"),pathname:`/${locale}/tools/screenshot-stitcher`});}
export default async function Page({params}:PageProps){const{locale}=await params;if(!hasLocale(routing.locales,locale))notFound();setRequestLocale(locale);const t=await getTranslations("Tools.screenshotStitcher");return <><section className="border-b border-[var(--border)] bg-[var(--surface)]"><Container className="py-10 sm:py-14"><div className="max-w-4xl"><h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">{t("title")}</h1><p className="mt-4 text-lg leading-8 text-[var(--text-muted)]">{t("description")}</p></div></Container></section><Container className="py-8 sm:py-12"><ScreenshotStitcher/><section className="mt-8 grid gap-4 md:grid-cols-3"><Info title={t("guide.orderTitle")} text={t("guide.orderText")}/><Info title={t("guide.reviewTitle")} text={t("guide.reviewText")}/><Info title={t("guide.privacyTitle")} text={t("guide.privacyText")} blue/></section></Container></>}
function Info({title,text,blue=false}:{title:string;text:string;blue?:boolean}){return <div className={`rounded-2xl border p-5 ${blue?"border-[var(--info-border)] bg-[var(--info-bg)]":"border-[var(--border)] bg-[var(--surface)]"}`}><h2 className="font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{text}</p></div>}
