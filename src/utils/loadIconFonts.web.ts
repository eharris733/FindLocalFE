// Inject @font-face rules for vector icon fonts on web builds.
// This helps when deploying to CDNs like Cloudflare where MIME/CORS can block auto-loading.

// Import TTFs directly so the bundler emits them to /assets and we can reference the URLs.
// These paths are stable within @expo/vector-icons.
// If these ever change, adjust to the new vendor path or switch to explicit asset copies.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - allow importing .ttf as a string URL
import IoniconsFontUrl from '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - allow importing .ttf as a string URL
import AntDesignFontUrl from '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/AntDesign.ttf';

const STYLE_ELEMENT_ID = 'icon-fonts-style';

export function loadIconFonts() {
  if (typeof document === 'undefined') return; // SSR safety
  if (document.getElementById(STYLE_ELEMENT_ID)) return; // already injected

  const css = `
    @font-face {
      font-family: Ionicons;
      src: url('/fonts/ionicons.ttf') format('truetype'), url(${IoniconsFontUrl}) format('truetype');
      font-style: normal;
      font-weight: 400;
      font-display: swap;
    }

    @font-face {
      font-family: anticon;
      src: url('/fonts/antdesign.ttf') format('truetype'), url(${AntDesignFontUrl}) format('truetype');
      font-style: normal;
      font-weight: 400;
      font-display: swap;
    }
  `;

  const style = document.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);
}
