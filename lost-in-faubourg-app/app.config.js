import 'dotenv/config';

export default {
  expo: {
    name: "lost-in-faubourg-app",
    slug: "lost-in-faubourg-app",
    owner: "valentin514",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "com.valentin514.lostinfaubourgapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.valentin514.lostinfaubourgapp",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: "com.valentin514.lostinfaubourgapp",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      config: {
        googleMaps: {
          apiKey: "youAIzaSyDfv2-YoXgh3gE2ck-LhfNj9njU8Hj9LxU", 
        },
      },
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      eas: {
        projectId: "cd18a56b-e538-4a0d-a45e-52b84e993aa0",
      },
      androidClientId: "876949776030-i8f75o4us24vdeavtfv4q4rnjfpfg00b.apps.googleusercontent.com",
      googleMapsApiKey: "youAIzaSyDfv2-YoXgh3gE2ck-LhfNj9njU8Hj9LxU",
    },
  },
};