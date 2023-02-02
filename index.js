const minor = require("semver/functions/minor");
const path = require("path");
const madge = require("madge");
const appRootPath = require("app-root-path");
const deepmerge = require("deepmerge");
const glob = require("glob");

const { name } = require("./package.json");
const { version } = require("react-native/package.json");
const reactNativeMinorVersion = minor(version);

const upstreamTransformer = (() => {
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
})();

// basically is a node_module
function isNodeModule(parent, dir) {
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
const getModuleDependencies = (moduleFileTree, madged, referrer) => {
  return  [].concat(
    ...moduleFileTree.map(
      (currentModuleFile) => madged
        .depends(path.relative(referrer, currentModuleFile).substring(3))
        .filter((_, i) => i === 0)
        .map(() => currentModuleFile),
    ),
  );
};

const getPackageNameByFilepath = (nodeModulesDir, relative) => {
  const arr = relative.substring(`${nodeModulesDir}${path.sep}`.length).split(path.sep);
  const [packageName, maybePackageSubpath] = arr;
  if (packageName.startsWith('@')) {
    return `${packageName}/${maybePackageSubpath}`;
  }
  return packageName;
};

// Returns an array of inter-package dependencies within the globalScope.
const getAllowedModuleDependenciesForFile = (nodeModulesDir, globalScope, referrer) => {
  const pkg = getPackageNameByFilepath(nodeModulesDir, referrer);
  return globalScope.filter(
    e => getPackageNameByFilepath(nodeModulesDir, e) === pkg
  );
};

module.exports.transform = async function anisotropicTransform(src, filename, options) {
  if (typeof src === "object") {
    // handle RN >= 0.46
    ({ src, filename, options } = src);
  }

  const { customTransformOptions: { [name]: anisotropicTransformOptions } } = deepmerge(defaultOptions, options);
  const {
    madge: madgeOptions,
    [TYPE_CYCLIC_DEPENDENTS]: cyclicDependents,
    [TYPE_GLOBAL_SCOPE_FILTER]: disallowedPackageConfigs,
    resolve,
  } = anisotropicTransformOptions;

  const nodeModulesDir = path.resolve(`${appRootPath}`, "node_modules");
  const absoluteFilepath = normalize(`${appRootPath}`, filename);
  const allFilesFromDisallowedPackages = [].concat(
    ...Object.keys(disallowedPackageConfigs).map(module => glob.sync(`${
      path.resolve(nodeModulesDir, module)
    }/**/*`)),
  );

  if (isNodeModule(nodeModulesDir, absoluteFilepath)) {
    /* dependency graph */
    const madged = await madge(filename, madgeOptions);
    const keys = madged.obj();

    Object.keys(keys).forEach((key) => {
      const currentFileTarget = normalize(path.dirname(absoluteFilepath), key);
      const moduleDependencies = getModuleDependencies(allFilesFromDisallowedPackages, madged, absoluteFilepath);

      if (moduleDependencies.length) {
        const allowedModuleDependencies = getAllowedModuleDependenciesForFile(nodeModulesDir, moduleDependencies, absoluteFilepath);
        const disallowedModuleDependencies = moduleDependencies.filter(
          (maybeDisallowedGlobalScope) =>
            allowedModuleDependencies.indexOf(maybeDisallowedGlobalScope) < 0,
        );

        if (disallowedModuleDependencies.length) {
          const packageBlockedFromAccess = getPackageNameByFilepath(nodeModulesDir, absoluteFilepath)
          const actuallyDisallowedModuleDependencies = []

          for (const disallowedModuleFilepath of disallowedModuleDependencies) {
            const disallowedPackage = getPackageNameByFilepath(nodeModulesDir, disallowedModuleFilepath);
            const packageExceptions = disallowedPackageConfigs[disallowedPackage]?.exceptions || [];

            if (!packageExceptions.includes(packageBlockedFromAccess)) {
              actuallyDisallowedModuleDependencies.push(disallowedModuleFilepath);
            }
          }

          if (actuallyDisallowedModuleDependencies.length) {
            resolve({
              type: TYPE_GLOBAL_SCOPE_FILTER,
              referrer: absoluteFilepath,
              globalScope: actuallyDisallowedModuleDependencies,
            });
          }
        }
      }

      // If a node module depends on a NON-node module i.e. in user-land
      // project, then restrict it unless we have an exception.
      if (!isNodeModule(nodeModulesDir, currentFileTarget) && !absoluteFilepath.match(cyclicDependents)) {
        resolve({
          type: TYPE_CYCLIC_DEPENDENTS,
          referrer: absoluteFilepath,
          target: currentFileTarget,
        });
      }
    });
  }

  return upstreamTransformer.transform({ src, filename, options });
};
