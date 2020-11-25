var minor = require("semver/functions/minor");
var path = require("path");
var madge = require("madge");
var appRootPath = require("app-root-path");

var upstreamTransformer = null;

var reactNativeVersionString = require("react-native/package.json").version;
var reactNativeMinorVersion = minor(reactNativeVersionString);

if (reactNativeMinorVersion >= 59) {
  upstreamTransformer = require("metro-react-native-babel-transformer");
} else if (reactNativeMinorVersion >= 56) {
  upstreamTransformer = require("metro/src/reactNativeTransformer");
} else if (reactNativeMinorVersion >= 52) {
  upstreamTransformer = require("metro/src/transformer");
} else if (reactNativeMinorVersion >= 47) {
  upstreamTransformer = require("metro-bundler/src/transformer");
} else if (reactNativeMinorVersion === 46) {
  upstreamTransformer = require("metro-bundler/build/transformer");
} else {
  // handle RN <= 0.45
  var oldUpstreamTransformer = require("react-native/packager/transformer");
  upstreamTransformer = {
    transform({ src, filename, options }) {
      return oldUpstreamTransformer.transform(src, filename, options);
    }
  };
}

function isSubDirectory(parent, dir) {
  const relative = path.relative(parent, dir);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function normalize(parent, child) {
  return path.normalize(`${parent}${path.sep}${child}`);
}


module.exports.transform = async function (src, filename, options) {
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
        console.error(`⚠️ ${file} attempted to reference ${parent}!`);
      }
    });
  }

  return upstreamTransformer.transform({ src, filename, options });
};

