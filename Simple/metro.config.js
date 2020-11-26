const { getDefaultConfig } = require("metro-config");

module.exports = (async () => {
  const {
    resolver: { sourceExts }
  } = await getDefaultConfig();
  return {
    transformer: {
      babelTransformerPath: require.resolve("./metro.transform.js"),
    },
    resolver: {
      sourceExts: [...sourceExts],
    }
  };
})();
