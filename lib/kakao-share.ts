type KakaoSdk = {
  init: (key: string) => void;
  isInitialized: () => boolean;
  Share: { sendDefault: (options: { objectType: "text"; text: string; link: { mobileWebUrl: string; webUrl: string } }) => void };
};

declare global {
  interface Window { Kakao?: KakaoSdk }
}

const SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js";
const SDK_INTEGRITY = "sha384-oroumrnFVE0xtgqyDZJARgERibXg2C28380uaUZz2kHDS5CR7tu20eGiOU6GkTpy";
let loading: Promise<KakaoSdk> | undefined;

function loadKakaoSdk(): Promise<KakaoSdk> {
  if (window.Kakao) return Promise.resolve(window.Kakao);
  if (loading) return loading;
  loading = new Promise<KakaoSdk>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.integrity = SDK_INTEGRITY;
    script.crossOrigin = "anonymous";
    script.async = true;
    script.onload = () => window.Kakao ? resolve(window.Kakao) : reject(new Error("kakao-sdk-unavailable"));
    script.onerror = () => { script.remove(); reject(new Error("kakao-sdk-load-failed")); };
    document.head.append(script);
  }).catch(error => { loading = undefined; throw error; });
  return loading;
}

export async function prepareKakaoShare(): Promise<void> {
  await loadKakaoSdk();
}

export async function shareWithKakao(key: string, url: string, title: string): Promise<void> {
  const sdk = await loadKakaoSdk();
  if (!sdk.isInitialized()) sdk.init(key);
  sdk.Share.sendDefault({ objectType: "text", text: title, link: { mobileWebUrl: url, webUrl: url } });
}
