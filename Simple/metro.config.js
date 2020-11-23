const { getDefaultConfig } = require("metro-config");

const options = {
};

module.exports = (async () => {
  const {
    resolver: { sourceExts }
  } = await getDefaultConfig();
  return {
    transformer: {
      babelTransformerPath: require.resolve("./metro-plugin-anisotropic-transform.js"),
    },
    resolver: {
      sourceExts: [...sourceExts],
    }
  };
})();