const appJson = require("./app.json");

const appEnv = process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";

module.exports = {
  ...appJson.expo,
  extra: {
    ...(appJson.expo.extra ?? {}),
    appEnv,
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
  },
};
