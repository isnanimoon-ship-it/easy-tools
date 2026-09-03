import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import { P2PFileTransfer } from "@/components/tools/p2p-file-transfer/p2p-file-transfer";
import { routing } from "@/i18n/routing";
import { isSessionId } from "@/lib/tools/p2p-file-transfer/protocol";

export const metadata: Metadata = { title: "File transfer", robots: { index: false, follow: false, noarchive: true, nosnippet: true }, referrer: "no-referrer" };
type PageProps = { params: Promise<{ locale: string; sessionId: string }> };
export default async function ReceiverPage({ params }: PageProps) { const { locale, sessionId } = await params; if (!hasLocale(routing.locales, locale) || !isSessionId(sessionId)) notFound(); setRequestLocale(locale); return <Container className="py-8 sm:py-12"><P2PFileTransfer role="receiver" sessionId={sessionId}/></Container>; }
