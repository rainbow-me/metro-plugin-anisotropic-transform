const {transform: anisotropic} = require("metro-plugin-anisotropic-transform");

module.exports.transform = async function (src, filename, options) {
  return anisotropic(src, filename, options);
};

