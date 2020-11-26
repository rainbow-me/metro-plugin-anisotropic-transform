const minor = require("semver/functions/minor");
const path = require("path");
const madge = require("madge");
const appRootPath = require("app-root-path");

const {version} = require("react-native/package.json");
const reactNativeMinorVersion = minor(version);

const getUpstreamTransformer = () => {
  if (reactNativeMinorVersion >= 59) {
    return require("metro-react-native-babel-transformer");
  } else if (reactNativeMinorVersion >= 56) {
    return require("metro/src/reactNativeTransformer");
  } else if (reactNativeMinorVersion >= 52) {
    return require("metro/src/transformer");
  } else if (reactNativeMinorVersion >= 47) {
    return require("metro-bundler/src/transformer");
  } else if (reactNativeMinorVersion === 46) {
    return require("metro-bundler/build/transformer");
  } else {
    // handle RN <= 0.45
    const oldUpstreamTransformer = require("react-native/packager/transformer");
    return {
      transform: ({ src, filename, options }) =>
        oldUpstreamTransformer.transform(src, filename, options),
    };
  }
};

function isSubDirectory(parent, dir) {
  const relative = path.relative(parent, dir);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function normalize(parent, child) {
  return path.normalize(`${parent}${path.sep}${child}`);
}


module.exports.transform = async function anisotropicTransform(src, filename, options) {
  if (typeof src === "object") {
    // handle RN >= 0.46
    ({ src, filename, options } = src);
  }

  const {...madged} = (await madge(filename, {
    includeNpm: true,
    fileExtensions: ['js', 'jsx', 'ts', 'tsx'],
    detectiveOptions: {
      es6: {
        mixedImports: true
      }
    },
  })).obj();

  const nodeModulesDir = path.resolve(`${appRootPath}`, 'node_modules');
  const file = normalize(`${appRootPath}`, filename);

  if (isSubDirectory(nodeModulesDir, file)) {
    Object.keys(madged).forEach((e) => {
      const parent = normalize(path.dirname(file), e);
      if (!isSubDirectory(nodeModulesDir, parent)) {
        console.error(`⚠️  ${file} -> ${parent}!`);
      }
    });
  }

  return getUpstreamTransformer().transform({ src, filename, options });
};

