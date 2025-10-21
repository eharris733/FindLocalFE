import { Html, Head, Main, Scripts } from 'expo-router';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* 
          Load icon fonts statically for production builds.
          These @font-face rules reference the font files bundled by Expo.
          The require() calls ensure Expo bundles the fonts into /assets/.
        */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @font-face {
              font-family: 'Ionicons';
              src: url(${require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf')}) format('truetype');
              font-display: swap;
            }
            @font-face {
              font-family: 'antdesign';
              src: url(${require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/AntDesign.ttf')}) format('truetype');
              font-display: swap;
            }
          `
        }} />
      </Head>
      <body>
        <Main />
        <Scripts />
      </body>
    </Html>
  );
}
