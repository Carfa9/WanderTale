module.exports = ({config}) => {
  const appEnv = process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
  const plugins = config.plugins ?? [];
  const hasSecureStore = plugins.some((plugin) =>
    Array.isArray(plugin) ? plugin[0] === "expo-secure-store" : plugin === "expo-secure-store"
  );

  return {
    ...config,
    plugins: hasSecureStore ? plugins : [...plugins, "expo-secure-store"],
    extra: {
      ...(config.extra ?? {}),
      appEnv,
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
    },
  };
};
