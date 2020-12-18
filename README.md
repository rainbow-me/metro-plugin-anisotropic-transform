# metro-plugin-anisotropic-transform
⚛️  🧲 Intercept and mutate runtime dependency resolution.

## 💪 Motivation
[`metro-plugin-anisotropic-transform`](.) is a transform plugin for [**React Native**](https://reactnative.dev)'s [**Metro Bundler**](https://github.com/facebook/metro). It is designed to inspect the relationships that exist between dependencies; specifically, those in the `node_modules/` directory which make a cyclic dependence to the root project.

This transform is designed to fulfill the following functionality:
  - Suppress cyclic dependencies on the root project, which can lead to drastically increased installation time.
  - Derisk the possibility of library dependencies relying upon runtime functionality exported by the root project.
  - Prevent dependencies from squatting on critical functionality exported by other `node_modules`.

### 🤔 How does it work?
Applications built using [**React Native**](https://reactnative.dev) are forced to resolve **all** module dependencies at bundle time. This is because unlike the [**Node.js**](https://nodejs.org/en/) ecosystem, the entire dependency map of the compiled application must be resolved prior to app distrbution in order translate into a fixed application bundle that can be transported.

This makes the following impact on the compilation process:

  - Dynamic `require`s are **not currently possible** in [**React Native**](https://reactnative.dev). All attempts to `import` and `require`, even those which have been deferred until execution time,  must be resolved during the bundle phase.
  - The entire scope of an application's module resolution map can be determined and interrogated at bundle time.

[`metro-plugin-anisotropic-transform`](.) utilizes these restrictions in library resolution to compare and handle relationships between the core application and children of the `node_modules` directory, and in these cases, resolve appropriately. 

## 📚 Guide

### 🚀 1. Installing

Using [**Yarn**](https://yarnpkg.com):

```sh
yarn add --dev metro-plugin-anisotropic-transform
```

### 📝 2. Creating a `metro.transform.js`

We'll create our own custom [**Metro**](https://github.com/facebook/metro) transform to invoke the anisotropic transform.

```javascript
const deepmerge = require("deepmerge");
const { transform: anisotropic } = require("metro-plugin-anisotropic-transform");

module.exports.transform = function ({
  src,
  filename,
  options,
}) {
  const opts = deepmerge(options, {
    customTransformOptions: {
      ["metro-plugin-anisotropic-transform"]: {
        cyclicDependents: /.+\/node_modules\/expo\/AppEntry\.js$/,
        globalScopeFilter: {
          'react-native-animated-charts': null,
        },
      },
    },
  });
  return anisotropic({ src, filename, options: opts });
};
```

> **Note:** Here we use `deepmerge` to safely propagate received transform options from the preceding step in the bundler chain.

Inside `customTransformOptions`, we declare a child object under the key `metro-plugin-anisotropic-transform` which can be used to specify configuration arguments. In this example, we've defined a simple [`RegExp`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp) to permit a cyclic dependency on `/node_modules/expo/AppEntry.js`, which is required for [**Expo**](https://expo.io) projects. In this instance, any other dependencies in the `node_modules` directory which does not match this pattern will cause the bundler to fail.

> **Note:** In production environments, it is imported to declare the **full system path** to the resolved dependency. This is because bad actors could exploit a simple directory structure to create a _technically allowable_ path, i.e. `node_modules/evil-dangerous-package/node_modules/expo/AppEntry.js`.

Additionally, we define the `globalScopeFilter` property. This is used to escape any library dependencies from asserting a dependence upon another library in your `node_modules` directory. In this example, the metro bundler will terminate bundling if an included dependency asserts a dependence upon [`react-native-animated-charts`](https://github.com/rainbow-me/react-native-animated-charts).

### 3. ♾️ Applying the Transform

Finally, you'll need to update your `metro.config.js` to invoke the `metro.transform.js` during the bundle phase:

```diff
module.exports = {
+  transformer: {
+    babelTransformerPath: require.resolve("./metro.transform.js"),
+  },
};
```

If you're using [**Expo**](https://expo.io), you'll also need to update your `app.json` in addition to updating your `metro.config.js`:

```diff
{
  "expo": {
    "packagerOpts": {
+      "transformer": "./metro.transform.js"
    }
  }
}
```

And that's everything! Now whenever you rebundle your application, your application source will be passed through the anisotropic transform and any cyclic dependencies in your project will be detected.

> ⚠️  **Important!** Whenever you apply any changes to your bundler configuration, you **must** clear the cache by calling `react-native start --reset-cache`.


## ⚙️ Options

[`babel-plugin-anisotropic-transform`](.) defaults to the following configuration:

```javascript
{
  madge: {
    includeNpm: true,
    fileExtensions: ["js", "jsx", "ts", "tsx"],
    detectiveOptions: {
      es6: {
        mixedImports: true
      }
    },
  }, 
  cyclicDependents: /a^/, /* by default, do not permit anything */
  globalScopeFilter: {}, /* no filtering applied */
  resolve: ({ type, referrer, ...extras }) => {
    if (type === 'cyclicDependents') {
      const {target} = extras;
      throw new Error(`Detected a cyclic dependency.  (${referrer} => ${target})`);
    } else if (type === 'globalScopeFilter') {
      const {module} = extras;
      throw new Error(`Detected disallowed dependence upon "${module}". (${referrer})`);
    }
    throw new Error(`Encountered unimplemented type, "${type}".`);
  },
}
```

### `madge`
Controls invocation of the [`madge`](https://github.com/pahen/madge) tool, which is used to interrogate module relationships. See [**Madge Configuration**](https://github.com/pahen/madge#configuration).

### `cyclicDependents`
A [`RegExp`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp) which determines which cyclic dependencies are permitted to exist. By default, none are allowed.

### `globalScopeFilter`
An object whose keys map to dependencies in your `node_modules` directory which are not permitted to be included by other dependencies. This is useful for preventing libraries from executing potentially priviledged functionality exported by another module.
  - The values of this property are currently unused. For future proofing, consider using an empty object `{}`.

### `resolve`
A function called when the anisotropic platform detects a sensitive relationship. By default, this is configured to `throw` and prevent the bundler from continuing.

## 🌈 License
[**MIT**](./LICENSE)

