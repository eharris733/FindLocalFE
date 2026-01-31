module.exports = {
  expo: {
    name: "Find Local",
    slug: "find-local-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/monocle.png",
    scheme: "findlocal",
    userInterfaceStyle: "light",
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.anonymous.findlocalmobile",
      entitlements: {
        "com.apple.developer.applesignin": ["Default"]
      },
      infoPlist: {
        CFBundleAllowMixedLocalizations: true,
        ITSAppUsesNonExemptEncryption: false,
        NSPhotoLibraryUsageDescription: "This app needs access to your photo library to add cover photos to your events.",
        NSCameraUsageDescription: "This app needs access to your camera to take photos for your events.",
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
          NSExceptionDomains: {
            localhost: {
              NSExceptionAllowsInsecureHTTPLoads: true
            }
          }
        }
      },
      usesAppleSignIn: true,
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      }
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#006B5E"
      },
      package: "com.anonymous.findlocalmobile",
      permissions: [
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "CAMERA"
      ],
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        }
      }
    },
    web: {
      favicon: "./assets/monocle.png",
      bundler: "metro",
      output: "static",
      build: {
        babel: {
          include: ["@expo-google-fonts/work-sans"]
        }
      }
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-apple-authentication",
      [
        "expo-font",
        {
          fonts: [
            "node_modules/@expo-google-fonts/work-sans/300Light/WorkSans_300Light.ttf",
            "node_modules/@expo-google-fonts/work-sans/400Regular/WorkSans_400Regular.ttf",
            "node_modules/@expo-google-fonts/work-sans/500Medium/WorkSans_500Medium.ttf",
            "node_modules/@expo-google-fonts/work-sans/600SemiBold/WorkSans_600SemiBold.ttf",
            "node_modules/@expo-google-fonts/work-sans/700Bold/WorkSans_700Bold.ttf"
          ]
        }
      ],
      "expo-web-browser",
      "@react-native-community/datetimepicker"
    ],
    extra: {
      router: {},
      eas: {
        projectId: "4ca36fa9-6538-4609-b180-2ff71d05bb9b"
      }
    }
  }
};
