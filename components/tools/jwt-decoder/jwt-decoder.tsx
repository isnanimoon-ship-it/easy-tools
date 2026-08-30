"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, RotateCcw, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { JsonTreeView } from "@/components/tools/jwt-decoder/json-tree-view";
import { analyzeClaims, type TimeClaimResult } from "@/lib/tools/jwt-decoder/claims";
import { analyzeStructure, decodeSegment, type SegmentDecodeResult } from "@/lib/tools/jwt-decoder/decode";
import { prettyJson } from "@/lib/tools/jwt-decoder/highlight";
import { buildSampleJwt } from "@/lib/tools/jwt-decoder/sample";

const DEBOUNCE_MS = 200;

const ALGORITHM_DESCRIPTIONS: Record<string, string> = {
  HS256: "HMAC + SHA-256",
  HS384: "HMAC + SHA-384",
  HS512: "HMAC + SHA-512",
  RS256: "RSA + SHA-256",
  RS384: "RSA + SHA-384",
  RS512: "RSA + SHA-512",
  ES256: "ECDSA + SHA-256",
  ES384: "ECDSA + SHA-384",
  ES512: "ECDSA + SHA-512",
  PS256: "RSASSA-PSS + SHA-256",
  PS384: "RSASSA-PSS + SHA-384",
  PS512: "RSASSA-PSS + SHA-512",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function JwtDecoder() {
  const t = useTranslations("Tools.jwtDecoder");
  const locale = useLocale();
  const [input, setInput] = useState("");
  const [debouncedInput, setDebouncedInput] = useState("");
  const [copiedTarget, setCopiedTarget] = useState<"jwt" | "header" | "payload" | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    // Date.now() is impure and must not run during render; snapshotting it
    // here (inside the timer callback, not the effect body itself) keeps
    // "now" in sync with whatever debouncedInput/claims are about to show.
    const timer = setTimeout(() => {
      setDebouncedInput(input);
      setNowMs(Date.now());
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  const structure = useMemo(() => analyzeStructure(debouncedInput), [debouncedInput]);

  const header: SegmentDecodeResult | null = useMemo(
    () => (structure.kind === "jws" ? decodeSegment(structure.header) : null),
    [structure],
  );
  const payload: SegmentDecodeResult | null = useMemo(
    () => (structure.kind === "jws" ? decodeSegment(structure.payload) : null),
    [structure],
  );
  const claims = useMemo(
    () => (payload?.ok && nowMs !== null ? analyzeClaims(payload.value, nowMs, locale) : null),
    [payload, nowMs, locale],
  );

  const treeLabels = {
    expandNode: t("tree.expandNode"),
    collapseNode: t("tree.collapseNode"),
    copyValue: t("tree.copyValue"),
    copied: t("tree.copied"),
  };

  function resetAll() {
    setInput("");
    setDebouncedInput("");
    setNowMs(null);
    inputRef.current?.focus();
  }

  function loadSample() {
    const sample = buildSampleJwt();
    setInput(sample);
    setDebouncedInput(sample); // skip the debounce for an explicit, deliberate action
    setNowMs(Date.now());
  }

  async function copy(text: string, target: "jwt" | "header" | "payload") {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTarget(target);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedTarget(null), 2000);
    } catch {
      // Clipboard API can be unavailable (insecure context, permission denied);
      // the button simply stays unconfirmed, no separate error state needed.
    }
  }

  const expirationLabel =
    claims === null
      ? null
      : claims.expirationStatus === "none"
        ? t("status.expirationNone")
        : claims.expirationStatus === "invalid"
          ? t("status.expirationInvalid")
          : claims.expirationStatus === "not-expired"
            ? t("status.expirationNotExpired")
            : t("status.expirationExpired");

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="jwt-input-label"
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <label id="jwt-input-label" htmlFor="jwt-input" className="block text-lg font-bold text-[var(--foreground)]">
            {t("input.label")}
          </label>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={loadSample}>
              <Sparkles size={17} />
              {t("actions.loadSample")}
            </Button>
            <Button variant="secondary" disabled={!input} onClick={resetAll}>
              <RotateCcw size={17} />
              {t("actions.reset")}
            </Button>
          </div>
        </div>
        <textarea
          ref={inputRef}
          id="jwt-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t("input.placeholder")}
          rows={6}
          spellCheck={false}
          className="min-h-32 w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 font-mono text-sm leading-6 text-[var(--foreground)] placeholder:font-sans placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
        />
        {structure.kind === "jws" ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => copy(debouncedInput, "jwt")}>
              <Copy size={17} />
              {copiedTarget === "jwt" ? t("actions.copied") : t("actions.copyJwt")}
            </Button>
          </div>
        ) : null}
      </section>

      {structure.kind === "too-large" ? (
        <p role="alert" className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-4 font-semibold text-[var(--error-fg)]">
          {t("errors.tooLarge")}
        </p>
      ) : structure.kind === "too-few-segments" ? (
        <p role="alert" className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-4 font-semibold text-[var(--error-fg)]">
          {t("errors.tooFewSegments")}
        </p>
      ) : structure.kind === "jwe" ? (
        <p className="rounded-xl bg-[var(--info-bg)] p-4 text-sm leading-6 text-[var(--info-fg)]">
          {t("errors.jwe")}
        </p>
      ) : structure.kind === "unsupported-segment-count" ? (
        <p role="alert" className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-4 font-semibold text-[var(--error-fg)]">
          {t("errors.unsupportedSegments", { count: structure.count })}
        </p>
      ) : null}

      {structure.kind === "jws" ? (
        <>
          <section
            aria-labelledby="jwt-status-heading"
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6"
          >
            <h2 id="jwt-status-heading" className="font-bold text-[var(--foreground)]">
              {t("status.title")}
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-[var(--text-muted)]">{t("status.structureLabel")}</dt>
                <dd className="font-semibold text-[var(--foreground)]">{t("status.structureOk")}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">{t("status.payloadLabel")}</dt>
                <dd className="font-semibold text-[var(--foreground)]">
                  {payload?.ok ? t("status.payloadOk") : t("status.payloadFail")}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">{t("status.expirationLabel")}</dt>
                <dd className="font-semibold text-[var(--foreground)]">{expirationLabel ?? t("status.expirationNone")}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">{t("status.signatureLabel")}</dt>
                <dd className="font-semibold text-[var(--foreground)]">{t("status.signatureNotVerified")}</dd>
              </div>
            </dl>
          </section>

          <p className="rounded-xl bg-[var(--info-bg)] p-4 text-sm leading-6 text-[var(--info-fg)]">
            {t("security.notice")}
          </p>

          <section
            aria-labelledby="jwt-header-heading"
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 id="jwt-header-heading" className="font-bold text-[var(--foreground)]">
                {t("header.title")}
              </h2>
              {header?.ok ? (
                <Button variant="secondary" onClick={() => copy(prettyJson(header.value), "header")}>
                  <Copy size={17} />
                  {copiedTarget === "header" ? t("actions.copied") : t("actions.copyHeader")}
                </Button>
              ) : null}
            </div>
            {header?.ok ? (
              <>
                <JsonTreeView value={header.value} labels={treeLabels} />
                {isRecord(header.value) ? (
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    {typeof header.value.alg === "string" ? (
                      <div>
                        <dt className="text-[var(--text-muted)]">{t("header.algorithm")}</dt>
                        <dd className="font-semibold text-[var(--foreground)]">
                          {header.value.alg}
                          {ALGORITHM_DESCRIPTIONS[header.value.alg] ? (
                            <span className="block text-xs font-normal text-[var(--text-muted)]">
                              {ALGORITHM_DESCRIPTIONS[header.value.alg]}
                            </span>
                          ) : null}
                        </dd>
                      </div>
                    ) : null}
                    {typeof header.value.typ === "string" ? (
                      <div>
                        <dt className="text-[var(--text-muted)]">{t("header.type")}</dt>
                        <dd className="font-semibold text-[var(--foreground)]">{header.value.typ}</dd>
                      </div>
                    ) : null}
                    {typeof header.value.kid === "string" ? (
                      <div>
                        <dt className="text-[var(--text-muted)]">{t("header.keyId")}</dt>
                        <dd className="break-all font-semibold text-[var(--foreground)]">{header.value.kid}</dd>
                      </div>
                    ) : null}
                    {typeof header.value.cty === "string" ? (
                      <div>
                        <dt className="text-[var(--text-muted)]">{t("header.contentType")}</dt>
                        <dd className="font-semibold text-[var(--foreground)]">{header.value.cty}</dd>
                      </div>
                    ) : null}
                  </dl>
                ) : null}
                {isRecord(header.value) && header.value.alg === "none" ? (
                  <p className="mt-3 rounded-lg bg-[var(--warning-bg)] p-3 text-sm font-semibold text-[var(--warning-fg)]">
                    {t("header.algNone")}
                  </p>
                ) : null}
              </>
            ) : (
              <p role="alert" className="text-sm font-semibold text-[var(--error-fg)]">
                {header?.reason === "json" ? t("header.decodeFailedJson") : t("header.decodeFailedBase64")}
              </p>
            )}
          </section>

          <section
            aria-labelledby="jwt-payload-heading"
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 id="jwt-payload-heading" className="font-bold text-[var(--foreground)]">
                {t("payload.title")}
              </h2>
              {payload?.ok ? (
                <Button variant="secondary" onClick={() => copy(prettyJson(payload.value), "payload")}>
                  <Copy size={17} />
                  {copiedTarget === "payload" ? t("actions.copied") : t("actions.copyPayload")}
                </Button>
              ) : null}
            </div>
            {payload?.ok ? (
              <>
                <JsonTreeView value={payload.value} labels={treeLabels} />
                {!claims ? (
                  <p className="mt-3 text-sm text-[var(--text-muted)]">{t("payload.notObject")}</p>
                ) : (
                  <div className="mt-4 space-y-3 text-sm">
                    <h3 className="font-bold text-[var(--foreground)]">{t("claims.title")}</h3>
                    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <ClaimTime label={t("claims.exp")} claim={claims.exp} localLabel={t("claims.local")} utcLabel={t("claims.utc")} invalidLabel={t("claims.invalidValue")} noneLabel={t("claims.expNone")} />
                      <ClaimTime label={t("claims.iat")} claim={claims.iat} localLabel={t("claims.local")} utcLabel={t("claims.utc")} invalidLabel={t("claims.invalidValue")} noneLabel={t("claims.iatNone")} />
                      <ClaimTime label={t("claims.nbf")} claim={claims.nbf} localLabel={t("claims.local")} utcLabel={t("claims.utc")} invalidLabel={t("claims.invalidValue")} noneLabel={t("claims.nbfNone")} />
                      {claims.iss !== undefined ? (
                        <div>
                          <dt className="text-[var(--text-muted)]">{t("claims.iss")}</dt>
                          <dd className="break-all font-semibold text-[var(--foreground)]">{String(claims.iss)}</dd>
                        </div>
                      ) : null}
                      {claims.sub !== undefined ? (
                        <div>
                          <dt className="text-[var(--text-muted)]">{t("claims.sub")}</dt>
                          <dd className="break-all font-semibold text-[var(--foreground)]">{String(claims.sub)}</dd>
                        </div>
                      ) : null}
                      {claims.aud !== undefined ? (
                        <div>
                          <dt className="text-[var(--text-muted)]">{t("claims.aud")}</dt>
                          <dd className="break-all font-semibold text-[var(--foreground)]">
                            {Array.isArray(claims.aud) ? claims.aud.map(String).join(", ") : String(claims.aud)}
                          </dd>
                        </div>
                      ) : null}
                      {claims.jti !== undefined ? (
                        <div>
                          <dt className="text-[var(--text-muted)]">{t("claims.jti")}</dt>
                          <dd className="break-all font-semibold text-[var(--foreground)]">{String(claims.jti)}</dd>
                        </div>
                      ) : null}
                    </dl>
                    {claims.notBeforeStatus === "not-yet-active" ? (
                      <p className="rounded-lg bg-[var(--warning-bg)] p-3 font-semibold text-[var(--warning-fg)]">
                        {t("claims.nbfNotYetActive")}
                      </p>
                    ) : null}
                    {claims.iatInFuture ? (
                      <p className="rounded-lg bg-[var(--warning-bg)] p-3 font-semibold text-[var(--warning-fg)]">
                        {t("claims.iatFutureWarning")}
                      </p>
                    ) : null}
                  </div>
                )}
              </>
            ) : (
              <p role="alert" className="text-sm font-semibold text-[var(--error-fg)]">
                {payload?.reason === "json" ? t("payload.decodeFailedJson") : t("payload.decodeFailedBase64")}
              </p>
            )}
          </section>

          <section
            aria-labelledby="jwt-signature-heading"
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6"
          >
            <h2 id="jwt-signature-heading" className="font-bold text-[var(--foreground)]">
              {t("signature.title")}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{t("signature.label")}</p>
            <pre className="mt-3 max-h-32 overflow-x-auto whitespace-pre rounded-xl bg-[var(--surface-muted)] p-4 font-mono text-sm">
              {structure.signature}
            </pre>
          </section>
        </>
      ) : null}

      <p className="rounded-xl bg-[var(--info-bg)] p-4 text-sm leading-6 text-[var(--info-fg)]">
        {t("privacy")}
      </p>

      <section
        aria-labelledby="jwt-guide-heading"
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6"
      >
        <h2 id="jwt-guide-heading" className="font-bold text-[var(--foreground)]">
          {t("guide.title")}
        </h2>
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="font-semibold text-[var(--foreground)]">Header</dt>
            <dd className="text-[var(--text-muted)]">{t("guide.headerText")}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--foreground)]">Payload</dt>
            <dd className="text-[var(--text-muted)]">{t("guide.payloadText")}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--foreground)]">Signature</dt>
            <dd className="text-[var(--text-muted)]">{t("guide.signatureText")}</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">{t("guide.note")}</p>
      </section>
    </div>
  );
}

function ClaimTime({
  label,
  claim,
  localLabel,
  utcLabel,
  invalidLabel,
  noneLabel,
}: {
  label: string;
  claim: TimeClaimResult;
  localLabel: string;
  utcLabel: string;
  invalidLabel: string;
  noneLabel: string;
}) {
  return (
    <div>
      <dt className="text-[var(--text-muted)]">{label}</dt>
      {!claim.present ? (
        <dd className="font-semibold text-[var(--foreground)]">{noneLabel}</dd>
      ) : !claim.valid ? (
        <dd className="font-semibold text-[var(--error-fg)]">{invalidLabel}</dd>
      ) : (
        <dd className="font-semibold text-[var(--foreground)]">
          <span className="block">
            {localLabel}: {claim.local}
          </span>
          <span className="block">
            {utcLabel}: {claim.utc}
          </span>
          <span className="block text-xs font-normal text-[var(--text-muted)]">{claim.relative}</span>
        </dd>
      )}
    </div>
  );
}
