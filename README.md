# @witchcraft/nuxt-electron

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Module for building electron. It's similar to nuxt-electron but with the following changes:

- Watches the electron src-dir only.
- Kills electron on nuxt server restart.
- It's clearer how everything is just passed to vite-plugin-electron.
- Easier to understand the flow of the module using inline hooks.
- Does not add nuxt-electron's extra route stuff. We want control over route rendering strategy when not using electron. Also I have issues with a relative baseURL and setting electron to a different route. Instead on the electron side we correctly intercept and requests so that we don't need to change the layout of the build files.
- Defines several extra static variables to make this possible.
- Modifies the app for easier multi-platform builds.

There is a playground available but it only works locally due to electron.

<!-- ## Features -->


## Install
```bash
pnpx nuxi module add @witchcraft/nuxt-electron
```

## Usage

A directory structure like the following is suggested:
```
.dist/ (I prefer .dist over dist so it stays hidden and at the top)
	├─ [platform]
   ├─ .output (nuxt output)
   ├─ release
      ├─ ${productName}_${version}.${ext}
   ├─ build (for any intermediate builds like electron's)
app/ - nuxt code
app-electron/ - contains all the main/renderer code
```

For whatever electron builder you want to use, you must point it at the correct directories.

For `electron-builder` with the default directories the module uses and to have all the artifacts in one folder, add:

```
{
	"directories": {
		"output": ".dist/electron/release"
	},
	"files": [
		".dist/electron/build/**/*",
		".dist/electron/.output/public/**/*"
	],
	"linux": {
		"artifactName": "${productName}_${version}.${ext}",
		// ...
	},
	"mac": {
		"artifactName": "${productName}_${version}.${ext}",
		// ...
	},
	"win": {
		"artifactName": "${productName}_${version}.${ext}"
		// ...
	},
}
```

Add the following to the package.json:
```jsonc
// package.json
{
	"main": ".dist/electron/build/main.cjs",
	"scripts": {
		"======= electron": "=======",
		"dev:electron": "AUTO_OPEN=electron nuxi dev",
		"build:electron": "BUILD_ELECTRON=true nuxi build",
		"build:electron:pack": "electron-builder",
		"preview:electron": "./.dist/electron/release/linux-unpacked/app",
	}
}
```

By default the module will not open electron. You must set `process.env.AUTO_OPEN` to include the string `electron` or set `autoOpen `in the options to true. The idea is if you use other platform modules as well, you'd do `AUTO_OPEN=electron,android`, etc. for each module you wanted to actually have auto open.


### Electron Files

In main to get the correct paths during build and dev, use the `getPaths` helper.

To get the dev user data dir, use the `useDevDataDir` helper.

We also need to create the nuxt `file://` protocol handler for every window.
 
```ts
// main.ts

import { getPaths, useDevDataDir, createNuxtFileProtocolHandler } from "@witchcraft/nuxt-electron/electron"

const paths = getPaths()
const userDataDir = useDevDataDir() ?? app.getPath("userData")

// when creating a window later 
const win = new BrowserWindow({
	title: "...",
	webPreferences: {
		preload: paths.preloadPath
	}
})

// proxy /api requests to the real server (PUBLIC_SERVER_API_URL or whatever env variable you want)
const proxies = {
	"/api": process.env.PUBLIC_SERVER_API_URL ?? (
		process.env.VITE_DEV_URL
		?`${process.env.VITE_DEV_URL}:3000`
	: "")
}
// for every window
createNuxtFileProtocolHandler(win, paths.nuxtDir, proxies)
await win.loadURL(paths.windowUrl)
```
A full example is available in the playground.

Note that you'll need to run `preview` AND `preview:electron` at the same time to see how the `/api` route gets correctly proxied (to localhost in this case).

### Runtime Config

Anywhere in electron's renderer files you can also now use nuxt's public runtime config (only the public, you don't want to expose your server secrets to the electron app at all).

```ts
import { useNuxtRuntimeConfig } from "@witchcraft/nuxt-electron/electron"

const publicRuntimeConfig = useNuxtRuntimeConfig() 
```

### Renderer `useIsElectron` Composable Setup

To be absolutely sure we are in electron, in electron's preload script define `electron` on the window:

```ts
// preload.ts
contextBridge.exposeInMainWorld("electron", { })
```

This way the composable can then check if the global exists.

### Logging

An isomorphic logger is also available for electron, see [@witchcraft/nuxt-logger](https://npmjs.com/package/@witchcraft/nuxt-logger). The playground in this module includes it as an example.


## Misc Notes

Note that while nuxt's path aliases are passed to the electron vite config, you cannot use other nuxt paths (such as those added by modules, e.g. `#somemodule`) in electron. This is why a seperate `@witchcraft/nuxt-electron/electron` export is provided.


## How it Works

#### Development

Electron is pointed to the localhost server and sees a similar view to the web app except we must client side detect we're on electron and redirect to the `electronRoute`.

#### Production

Normally nuxt has to be configured to output a SPA by setting `ssr: false` and you have to modify baseURL and buildAssetsDir for everything to work (among other changes, see nuxt-electron module for the typical changes).

But this module has gone a different route.

First for production only changes, we run the nuxt config with a different env variable to enable electron only, production only options (such as route trimming, see [Electron Route](#Electron-Route)). 

Then we use a custom protocol to proxy requests.

##### Custom `file://` Handler 

Electron uses the `file://` protocol to load all scripts/assets/etc.

This does not work well with the default nuxt config so we use use a custom protocol handler to intercept all `file://` requests and correctly route them so that we don't have to be changing nuxt's baseURL and buildAssetsDir.

##### Electron Route
In electron we want to point to a different route, `/{electronRoute}`, so we can trim other routes from the bundle. 


To do this we prerender the `/{electronRoute}` route and point electron to `/{electronRoute}/index.html`. 
	- This used to require changing baseURL and buildAssetsDir to "./" and "/" respectively, but with the new `file://` handler it now works perfectly.

We then need to remove unwanted routes from the bundle which are included regardless of whether they're used. So for the web app, remove electron routes, and for the electron app, remove web app routes. This is done through a nuxt hook in the nuxt config on production builds only.

Note we would ideally also remove "/" from the prerender, but this requires manually splitting chunks by pages and I was having issues with this.

###### Why not use a redirect? 

A `routeRules` redirect won't work, because it will trigger a request to electron's file protocol handler which we don't know what to do with.

A redirect from a page (e.i. `if (process.client && isElectron) { navigateTo("/app") }`) works, but it takes a little big of time to navigate.

#### Build

Building for electron requires lots of changes to the config. We can't just build for web then copy. So this module reroutes the output when building the web app (and reroutes it differently when building for electron (see directory sturcture above).

The use out the nested .output is because nuxt preview will add this automatically even if we set a custom cwd. This was we can do `nuxt preview .dist/platform` though it might often not be of much help.

To build for electron you must set `process.env.BUILD_ELECTRON` to true, to do the configuration required to make the final output actually work with electron.

##### Electron Build

The electron app itself is "built" in two parts, the "build" and the "packing".

First the the nuxt app (`.dist/electron/.output`) and the electron main/preload bundles (`.dist/electron/build`) are build.

Then the script `build:electron:pack` is run (configurable).

The module does not run electron-builder directly since you could be packing the app in some other way.

Note that nuxt builds the server anyways, it's just not packed into the final app if you configure your packer correctly..

Your packer should then create the final executables (into `.dist/electron/release`).

## Development 

<details>
<summary>Scripts</summary>

```bash
# Install dependencies
pnpm install

# Generate type stubs
pnpm dev:prepare

# Develop with the playground
pnpm dev

# Build the playground
pnpm dev:build

# Run ESLint
pnpm lint

# Run Vitest
pnpm test
pnpm test:watch

# Release new version
pnpm release
  ```

</details>


<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/my-module/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/@witchcraft/nuxt-electron

[npm-downloads-src]: https://img.shields.io/npm/dm/my-module.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npmjs.com/package/@witchcraft/nuxt-electron

[license-src]: https://img.shields.io/npm/l/my-module.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/@witchcraft/nuxt-electron

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
