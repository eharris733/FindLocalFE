/**
 * Native font map for expo-font's `useFonts`.
 *
 * Web uses `fonts.web.ts` (an empty map) instead: the faces are self-hosted as
 * woff2 under public/fonts/ and declared via @font-face in
 * scripts/inject-head.js using these same family names. Keeping the
 * @expo-google-fonts imports out of the web module graph also stops Metro from
 * exporting the .ttf files to dist/assets/node_modules/**, which Cloudflare
 * Pages silently drops from uploads (see CLAUDE.md, fonts).
 */
import {
  Epilogue_400Regular,
  Epilogue_600SemiBold,
  Epilogue_700Bold,
} from '@expo-google-fonts/epilogue';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';

export const FONT_MAP: Record<string, number> = {
  Epilogue_400Regular,
  Epilogue_600SemiBold,
  Epilogue_700Bold,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
};
