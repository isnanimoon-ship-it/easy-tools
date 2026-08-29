"use client";

import Script from "next/script";

type NaverWcsWindow = Window & {
  wcs?: unknown;
  wcs_add?: Record<string, string>;
  wcs_do?: () => void;
};

export function NaverWcs() {
  const initialize = () => {
    const naverWindow = window as NaverWcsWindow;

    naverWindow.wcs_add ??= {};
    naverWindow.wcs_add.wa = "1aae2f601f9e1a0";

    if (naverWindow.wcs) {
      naverWindow.wcs_do?.();
    }
  };

  return (
    <Script
      id="naver-wcs"
      src="https://wcs.pstatic.net/wcslog.js"
      strategy="afterInteractive"
      onReady={initialize}
    />
  );
}
