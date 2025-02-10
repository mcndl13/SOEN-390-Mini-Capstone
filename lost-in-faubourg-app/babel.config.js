// export default function (api) {
//   api.cache(true);
//   return {
//     presets: ["babel-preset-expo"],
//     plugins: [
//       [
//         "module:react-native-dotenv",
//         {
//           path: ".env",
//           safe: true,
//           allowUndefined: false,
//         },
//       ],
//     ],
//   };
// }
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module:react-native-dotenv",
        {
          path: ".env",
          safe: true,
          allowUndefined: false,
        },
      ],
      "expo-router/babel", // Add expo-router plugin if using Expo Router
    ],
  };
};
