const minor = require("semver/functions/minor");
const path = require("path");
const madge = require("madge");
const appRootPath = require("app-root-path");
const deepmerge = require("deepmerge");
const glob = require("glob");

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

const TYPE_CYCLIC_DEPENDENTS = 'cyclicDependents';
const TYPE_GLOBAL_SCOPE_FILTER = 'globalScopeFilter';

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
      [TYPE_CYCLIC_DEPENDENTS]: /a^/, /* by default, do not permit anything */
      [TYPE_GLOBAL_SCOPE_FILTER]: {}, /* no filtering applied */
      resolve: ({ type, referrer, ...extras }) => {
        if (type === TYPE_CYCLIC_DEPENDENTS) {
          const {target} = extras;
          throw new Error(`${name}: Detected a cyclic dependency.  (${referrer} => ${target})`);
        } else if (type === TYPE_GLOBAL_SCOPE_FILTER) {
          const {globalScope} = extras;
          throw new Error(`${name}: Detected disallowed dependence upon ${globalScope.map(e => `"${e}"`).join(',')}. (${referrer})`);
        }
        throw new Error(`Encountered unimplemented type, "${type}".`);
      },
    },
  },
};

// Returns the list of dependencies a madged referrer has against a file tree.
const listDependencies = (moduleFileTree, madged, referrer) => {
  return  [].concat(
    ...moduleFileTree.map(
      (currentModuleFile) => madged
        .depends(path.relative(referrer, currentModuleFile).substring(3))
        .filter((_, i) => i === 0)
        .map(() => currentModuleFile),
    ),
  );
};

const getPackageNameByFilePath = (nodeModulesDir, relative) => {
  const arr = relative.substring(`${nodeModulesDir}${path.sep}`.length).split(path.sep);
  const [packageName, maybePackageSubpath] = arr;
  if (packageName.startsWith('@')) {
    return `${packageName}/${maybePackageSubpath}`;
  }
  return packageName;
};

// Returns an array of inter-package dependencies within the globalScope.
const getAllowedGlobalScope = (nodeModulesDir, globalScope, referrer) => {
  const pkg = getPackageNameByFilePath(nodeModulesDir, referrer);
  return globalScope.filter(
    e => getPackageNameByFilePath(nodeModulesDir, e) === pkg
  );
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
    [TYPE_CYCLIC_DEPENDENTS]: cyclicDependents,
    [TYPE_GLOBAL_SCOPE_FILTER]: globalScopeFilter,
    resolve,
  } = anisotropicTransformOptions;

  const nodeModulesDir = path.resolve(`${appRootPath}`, "node_modules");
  const file = normalize(`${appRootPath}`, filename);
  const moduleFileTree = [].concat(
    ...Object.keys(globalScopeFilter).map(module => glob.sync(`${
      path.resolve(nodeModulesDir, module)
    }/**/*`)),
  );

  if (isSubDirectory(nodeModulesDir, file)) {
    /* dependency graph */
    const madged = await madge(filename, madgeOptions);
    const keys = madged.obj();

    Object.keys(keys).forEach((key) => {
      const parent = normalize(path.dirname(file), key);
      const globalScope = listDependencies(moduleFileTree, madged, file);

      if (globalScope.length) {
        const allowedGlobalScope = getAllowedGlobalScope(nodeModulesDir, globalScope, file);
        const disallowedGlobalScope = globalScope.filter(
          (maybeDisallowedGlobalScope) =>
            allowedGlobalScope.indexOf(maybeDisallowedGlobalScope) < 0,
        );
        if (disallowedGlobalScope.length) {
          resolve({
            type: TYPE_GLOBAL_SCOPE_FILTER,
            referrer: file,
            globalScope: disallowedGlobalScope,
          });
        }
      }

      if (!isSubDirectory(nodeModulesDir, parent) && !file.match(cyclicDependents)) {
        resolve({
          type: TYPE_CYCLIC_DEPENDENTS,
          referrer: file,
          target: parent,
        });
      }
    });
  }

  return getUpstreamTransformer().transform({ src, filename, options });
};

