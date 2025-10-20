import { Html, Head, Main, Scripts } from 'expo-router';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link
          rel="preload"
          href="/fonts/ionicons.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/antdesign.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        <style>{`
          @font-face {
            font-family: Ionicons;
            src: url('/fonts/ionicons.ttf') format('truetype');
            font-style: normal;
            font-weight: 400;
            font-display: swap;
          }
          @font-face {
            font-family: anticon;
            src: url('/fonts/antdesign.ttf') format('truetype');
            font-style: normal;
            font-weight: 400;
            font-display: swap;
          }
        `}</style>
      </Head>
      <body>
        <Main />
  <Scripts />
      </body>
    </Html>
  );
}
