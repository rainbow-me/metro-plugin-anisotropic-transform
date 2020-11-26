const minor = require("semver/functions/minor");
const path = require("path");
const madge = require("madge");
const appRootPath = require("app-root-path");
const deepmerge = require("deepmerge");

const { name } = require("./package.json");
const { version } = require("react-native/package.json");
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

const defaultOptions = {
  customTransformOptions: {
    [name]: {
      madge: {
        includeNpm: true,
        fileExtensions: ["js", "jsx", "ts", "tsx"],
        detectiveOptions: {
          es6: {
            mixedImports: true
          }
        },
      }, 
      // Dependencies which depend upon the root project
      // are permitted to assert such a dependency.
      cyclicDependents: /a^/, /* by default, do not permit anything */
      resolve: ({ type, ...extras }) => {
        if (type === 'cyclicDependents') {
          const {target, referrer} = extras;
          throw new Error(`${name}: Detected a cyclic dependency.  (${referrer} => ${target})`);
        }
      },
    },
  },
};


module.exports.transform = async function anisotropicTransform(src, filename, options) {
  if (typeof src === "object") {
    // handle RN >= 0.46
    ({ src, filename, options } = src);
  }
  
  const opts = deepmerge(defaultOptions, options);
  const { customTransformOptions } = opts;
  const { [name]: anisotropicTransformOptions } = customTransformOptions;
  const {
    madge: madgeOptions,
    cyclicDependents,
    resolve,
  } = anisotropicTransformOptions;

  const nodeModulesDir = path.resolve(`${appRootPath}`, "node_modules");
  const file = normalize(`${appRootPath}`, filename);

  if (isSubDirectory(nodeModulesDir, file)) {
    const madged = (await madge(filename, madgeOptions)).obj();
    Object.keys(madged).forEach((e) => {
      const parent = normalize(path.dirname(file), e);
      if (!isSubDirectory(nodeModulesDir, parent) && !file.match(cyclicDependents)) {
        resolve({
          type: 'cyclicDependents',
          target: parent,
          referrer: file,
        });
      }
    });
  }

  return getUpstreamTransformer().transform({ src, filename, options });
};

