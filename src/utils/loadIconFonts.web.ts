/**
 * Web-specific icon font loader
 * Injects @font-face CSS declarations for vector icons
 * Required for react-native-vector-icons web compatibility
 */

// Import the actual font files to get their bundled URLs
// @ts-ignore - These imports work at build time
import IoniconsFont from '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf';
// @ts-ignore
import AntDesignFont from '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/AntDesign.ttf';

export function loadIconFonts() {
  if (typeof document === 'undefined') {
    return; // Not in a browser environment
  }

  // Check if fonts are already loaded
  if (document.getElementById('vector-icon-fonts')) {
    return;
  }

  const iconFontStyles = `
    @font-face {
      src: url(${IoniconsFont});
      font-family: Ionicons;
    }

    @font-face {
      src: url(${AntDesignFont});
      font-family: anticon;
    }
  `;

  // Create a stylesheet
  const style = document.createElement('style');
  style.id = 'vector-icon-fonts';
  style.type = 'text/css';

  // Append the iconFontStyles to the stylesheet
  if ('styleSheet' in style) {
    // @ts-ignore - IE support
    style.styleSheet.cssText = iconFontStyles;
  } else {
    style.appendChild(document.createTextNode(iconFontStyles));
  }

  // Inject the stylesheet into the document head
  document.head.appendChild(style);
}
