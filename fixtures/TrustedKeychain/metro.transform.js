const deepmerge = require('deepmerge');
const {transform: anisotropic} = require('metro-plugin-anisotropic-transform');

module.exports.transform = function ({src, filename, options}) {
  const opts = deepmerge(options, {
    customTransformOptions: {
      ['metro-plugin-anisotropic-transform']: {
        //cyclicDependents: /.+\/node_modules\/expo\/AppEntry\.js$/,
      },
    },
  });
  return anisotropic({src, filename, options: opts});
};
