# @witchcraft/nuxt-electron

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]



## Features

- :zap: Auto reloads/restarts electron on changes to the main/renderer code or nuxt server restarts.
- :rocket: Api calls are proxied to the server.
- :start: Rendering strategy isn't changed. Does not require static builds or changing baseURL/buildAssetsDir. 
- :scissors: Trims server and non-electron routes from the electron bundle.
- :open_file_folder: Modifies directory structure for easier multi-platform builds.
- :snowflake: Nix Support - Playground contains an example flake for reproducible development and builds.
- :hammer_and_wrench: Helpful Tools/Composables
	- `isElectron` 
	- Electron Only 
		- `useRuntimeConfig().public` (via `useNuxtRuntimeConfig`)
		- `registerDevtoolsShortcuts`
		- `useDevDataDir` (reroute the user data dir to a local folder during dev for easier development)
		- `ElectronWindowControls` component for completely custom window controls. 
		- Various helpers for setting up apis such as:
			- `createBroadcasters/createBroadcastHandlers` for sending messages to all windows.
			- `createWindowControlsApi` for calling close/minimize/maximize/pin from the renderer and an `ElectronWindowControls` component for rending a basic set.
			- `promisifyApi`(preload) and `promisifyReply`(main) for easily creating and handling apis in the preload script.
	- See also [@witchcraft/nuxt-logger](https://github.com/witchcraftjs/nuxt-logger) for electron logging utilities.

# Playground

There is a playground with a comprehensive example, but it only works locally due to electron.

To try it:

```bash
git clone https://github.com/witchcraftjs/nuxt-electron.git
pnpm i
cd nuxt-electron/playground
pnpm build && pnpm build:electron:no-pack
pnpm preview:electron:dev
```
You can also do: 
```bash
pnpm build
pnpm build:electron:pack
# in one tab
pnpm preview
# in another tab - replace `linux-unpacked` with your platform
OVERRIDE_PUBLIC_SERVER_URL=http://localhost:3000 ./.dist/electron/release/linux-unpacked/your-app-name
```

#### Nix

If you're using nix the first example should work in the dev shell. The second won't. You can do `nix run`, but warning, this is like building and doing `pnpm launch:electron` so it api will be pointed at production server (see below).

See [#Usage on Nix](#Usage-on-Nix) for more details.

## Install
```bash
pnpx nuxi module add @witchcraft/nuxt-electron

```
### Components

If using any of the provided components, they rely on the @witchcraft/ui module.

If not, ignore it.

This module installs it to use it's css config and twMerge.

All you need to do is add the electron module to your tailwind css as a source:
```css [assets/css/tailwind.css]
@source "../../../.nuxt/witchcraft-electron.css";
```

## Usage

A directory structure like the following is suggested:
```
[project root]
├── .dist/ (I prefer .dist over dist so it stays hidden and at the top)/
│   └── [platform]/
│       ├── .output/ (nuxt output)
│       ├── release/
│       │   └── ${productName}_${version}.${ext}
│       └── build/ (for any intermediate builds like electron's)
├── app/ - nuxt code
├── app-electron/ - contains all the main/renderer code
│   └── package.json - to control packaged dependencies
└── electron-builder-config.js

```
The module sets it up like this when building electron, but not for the regular build. You should set that to go elsewhere if you're using it (though it's not required).

```ts [nuxt.config.ts]
export default defineNuxtConfig({
	nitro: {
		output: {
			dir: ".dist/web/.output",
			serverDir: ".dist/web/.output/server",
			publicDir: ".dist/web/.output/public"
		}
	}
})
```

Usage of nuxt 4's new directory structure is recommended.

For whatever electron builder you want to use, you must point it at the correct directories.

For `electron-builder` with the default directories the module uses and to be able to control which dependencies are packaged with `app-electron/package.json` copy the following:

[electron-builder-config.js](https://github.com/witchcraftjs/nuxt-electron/blob/master/playground/electron-builder-config.js)
[app-electron/package.json](https://github.com/witchcraftjs/nuxt-electron/blob/master/playground/app-electron/package.json)

They should work out of the box, with the package name as configured in your package.json. 

Add the following to the package.json:

<details>
<summary>Package.json</summary>

```json
// package.json
{
	// these first properties are required to package the app
	"name": "your-app-name",
	"version": "0.0.0",
	"description": "Your app description",
	"author": "Your Name",
	"repository" :"...",
	"main": ".dist/electron/build/main.cjs",
	"scripts": {
		"dev": "nuxi dev",
		"build": "nuxi build",
		"preview": "LOG_LEVEL=trace nuxt preview .dist/web",
		"======= electron": "=======",
		"dev:electron": "AUTO_OPEN=electron pnpm dev",
		"launch:electron": "electron .",
		"launch:electron:dev": "LOG_LEVEL=trace OVERRIDE_PUBLIC_SERVER_URL=http://localhost:3000 electron .",
		"build:electron": "BUILD_ELECTRON=true pnpm build",
		"build:electron:pack": "APP_VERSION=0.0.0 electron-builder --config electron-builder-config.js",
		"build:electron:no-pack": "APP_VERSION=0.0.0 SKIP_ELECTRON_PACK=true BUILD_ELECTRON=true nuxi build",
		// write a dev desktop file for linux, see below
		"preview:electron:dev": "concurrently --kill-others \"pnpm preview\" \"sleep 2 && pnpm launch:electron:dev\"",
		"gen:dev:electron:desktop": "node node_modules/@witchcraft/nuxt-electron/genDevDesktop.js YOURAPPNAME",
	}
}
```
</details>

### To Develop

Run `pnpm dev:electron`. This will both launch nuxt and open electron.

Alternatively, run the server and electron seperately:

Run `pnpm dev` to start the nuxt dev server. The dev version of the app will be written to `.dist/electron/build/main.cjs`.

In a seperate terminal run `pnpm launch:electron` to start the electron app (this will do `electron .` which will run the configured `main` property, aka `.dist/electron/build/main.cjs`).

#### Notes
By default the module will not open electron. You must set `process.env.AUTO_OPEN` to include the string `electron` or set `autoOpen `in the options to true, hence the seperate `dev:electron` script.

The idea is if you use other platform modules as well, you'd do `AUTO_OPEN=electron,android`, etc. for each module you wanted to actually have auto open.

### To Build

Build the regular nuxt app with `pnpm build` then build the electron app with `pnpm build:electron` or `pnpm build:electron:no-pack` (if you just want to test, you can skip the packing).

In this case, the build written to `.dist/electron/build/main.cjs` is the **production** build.

To run the built production server and the production app proxied to this server, use `pnpm preview:electron:dev`.

Alternatively...

You can run `pnpm launch:electron` to launch the production build in nearly exactly as a user would.

CAREFUL though, **this will proxy api requests to the real server**.

ef you want to test against the local server build, run it with `pnpm preview` then run the app with `pnpm launch:electron:dev`.

If you use the example code, it allows `OVERRIDE_PUBLIC_SERVER_URL` which allows the app to override which server the app proxies to and that's what the script is setting to allow this.

You can handle this different if you want and *not* allow overriding the server url. Up to you. See below.

### Files

In main to get the correct paths during build and dev, use the `getPaths` helper.

To get the dev user data dir, use the `useDevDataDir` helper.

We also need to create the nuxt `app://` protocol handler for every window and configure the proxies for server calls.


See full example in [main.ts](https://github.com/witchcraftjs/nuxt-electron/blob/master/playground/app-electron/main.ts).

For the nuxt config, here's the minimum you need, the one in the playground contains additional options for testing and debugging:

<details>
<summary>nuxt.config.ts</summary>
	
```ts [nuxt.config.ts]
export default defineNuxtConfig({
	modules: [
		"@witchcraft/nuxt-electron",
		/** Optional */
		"@witchcraft/ui",
		/** Optional */
		"@witchcraft/nuxt-logger",
	],
			dir: ".dist/web/.output",
			serverDir: ".dist/web/.output/server",
			publicDir: ".dist/web/.output/public"
		},
	},
	electron: {
		additionalElectronVariables: {
			// this will hardcode `process.env.PUBLIC_SERVER_URL` to the server url in production
			// this means getPaths().publicServerUrl will always return your site url (see getPaths) unless you allow getPaths an override (see it for details)
			publicServerUrl: process.env.NODE_ENV === "production"
			// note the quotes for strings! this is a literal replacement that happens
			// you also cannot access process.env dynamically if you want this to work (e.g. process.env[name])
				? `"https://yoursite.com"`
				: `undefined`
		},
		// the module will set this to pre-render
		// additionalRoutes: ["/other-page-prerendered"]
	}
})
```
</details>

**NOTE: The proxies only work for api calls. They do not work for pages.**

Proxying server only page routes seems possible but complicated because each route's resource calls must also be proxied. I don't think it's worth the pain. It's easier to make sure the electron app never access server only routes.

### Runtime Config

Anywhere in electron's renderer files you can also now use nuxt's public runtime config (only the public, you don't want to expose your server secrets to the electron app at all).

```ts
import { useNuxtRuntimeConfig } from "@witchcraft/nuxt-electron/electron"

const publicRuntimeConfig = useNuxtRuntimeConfig() 
```

### Renderer `isElectron` Composable Setup

To be absolutely sure we are in electron, in electron's preload script define `electron` on the window:

```ts
// preload.ts
contextBridge.exposeInMainWorld("electron", { })
```

This way the composable can then check if the global exists.

### Logging

An isomorphic logger is also available for electron, see [@witchcraft/nuxt-logger](https://npmjs.com/package/@witchcraft/nuxt-logger). The playground in this module includes it as an example.

### Dev Desktop File

A script is provided for use with electron-builder to generate a dev desktop file for linux.

This is useful for when registering deep links in the app as these require a desktop file to work on linux.

It will create a desktop file named `dev-YOURAPPNAME.desktop`, put it in `~/.local/share/applications/` and re-install it with `xdg-desktop-menu un/install`.

The desktop's exec is set to run bash, cd into the project dir and run `pnpm launch:electron`. 

You can pass a second parameter to the script to use a different package.json script.

And a third parameter pointing to your config if it's not in one of the searched locations:

- `electron-builder-config.js`
- `electron-builder.json5`
- `electron-builder.json`

### Usage on Nix

As mentioned, the second example script won't work out of the box with nix. You need something like [nix-alien](https://github.com/thiagokokada/nix-alien) if you want to test the electron-builder packaged version (**which you should**, it is packaged completely different than on nix where electron builder is not used).

```
DEBUG=true LOG_LEVEL=trace nix run "github:thiagokokada/nix-alien#nix-alien" -- .dist/electron/release/linux-unpacked/your-app-name
```

Apart from that nix has some additional goodies.

First there flake with a devenv based shell and direnv support. If you have direnv run `direnv allow .` in the project root. Otherwise run `nix develop`.

Nearly everything should work, except the build electron-builder builds. You can do `nix run` instead.

The derivation for reference is [here](https://github.com/witchcraftjs/nuxt-electron/blob/master/playground/nix/derivation.nix).

There is also a debugging script `debugNixBuild` which drops you in a shell to run the derivation. See it for details. The shell should give you info about all scripts.

It uses a set of devenv flake utils I've created (see [here](https://github.com/alanscodelog/nix-devenv-utils)). They contain some good stuff like working support for electron (obviously), android, playwright, etc if you're interested.

## Misc Notes

- Note that while nuxt's path aliases are passed to the electron vite config, you cannot use other nuxt paths (such as those added by modules, e.g. `#somemodule`) in electron. This is why a seperate `@witchcraft/nuxt-electron/electron` export is provided.
- In any electron main code, import.meta.url is always the built main.mjs file regardless of whether you're in dev or prod or what file you're in.


## How it Works

### Development

Electron is pointed to the localhost server and sees a similar view to the web app except we must client side detect we're on electron and redirect to the `electronRoute`.

### Production

Normally nuxt has to be configured to output a SPA by setting `ssr: false` and you have to modify baseURL and buildAssetsDir for everything to work (among other changes, see nuxt-electron module for the typical changes).

But this module has gone a different route.

First for production only changes, we run the nuxt config with a different env variable to enable electron only, production only options (such as route trimming, see [Electron Route](#Electron-Route)). 

Then we use a custom protocol to proxy requests and api calls.

#### Custom `app://` Handler 

Electron uses the `file://` protocol by default to load all scripts/assets/etc. 

Loading from files does not work well with the default nuxt config so we use use a custom protocol handler to intercept these requests and correctly route them so that we don't have to be changing nuxt's baseURL and buildAssetsDir.

It is recommended to use a custom protocol instead of `file://`, so the example uses `app://`.

Additionally to have as close to regular browser behavior, the host is set to `bundle`.

So `getPaths` returns `app://bundle/path/to/file` for `windowUrl` in production.

This is because using a `standard` protocol schema, paths like `/path/to/file` are resolved relative to the host as they are in the browser.

Internally the protocol handler does the following:

- Checks the request is safe (does not try to escape the path given).
- Reroutes proxy requests to the correct url.
- Checks if the request exists as a file, if not, attempts to find the nested `index.html` file (e.g. `/some/path` will correctly load `/some/path/index.html`).

##### Electron Route
In electron we want to point to a different route, `/{electronRoute}`, so we can trim other routes from the bundle. 

To do this we prerender the `/{electronRoute}` route and point electron to `/{electronRoute}/index.html`. 
	- This used to require changing baseURL and buildAssetsDir to "./" and "/" respectively, but with the custom `app://` handler it should just work.

We then need to remove unwanted routes from the bundle which are included regardless of whether they're used. So for the web app, remove electron routes, and for the electron app, remove web app routes. This is done through a nuxt hook in the nuxt config on production builds only.

Note we would ideally also remove "/" from the prerender, but this requires manually splitting chunks by pages and I was having issues with this.

##### Why not use a redirect? 

A `routeRules` redirect won't work, because it will trigger a request to electron's file protocol handler which we don't know what to do with.

A redirect from a page (e.i. `if (process.client && isElectron) { await navigateTo("/app") }`) works, but it takes a little big of time to navigate. This is still needed for development redirecting, but not in production.

### Build

Building for electron requires lots of changes to the config. We can't just build for web then copy. So this module reroutes the output when building the web app (and reroutes it differently when building for electron (see directory sturcture above).

The reason for the nested `.output` is so it doesn't overwrite the default one. We can also do `nuxt preview .dist/platform` though it's often not of much help.

To build for electron you must set `process.env.BUILD_ELECTRON` to true, to do the configuration required to make the final output actually work with electron.

#### Electron Build

The electron app itself is "built" in two parts, the "build" and the "packing".

First the the nuxt app (`.dist/electron/.output`) and the electron main/preload bundles (`.dist/electron/build`) are built.

Then the script `build:electron:pack` is run (configurable).

The module does not run electron-builder directly since you could be packing the app in some other way.

Note that nuxt builds the server anyways, it's just not packed into the final app if you configure your packer correctly.

Your packer should then create the final executables (into `.dist/electron/release`).

### Debugging Tips

-  To inspect the asar, run `npx @electron/asar list .dist/electron/release/linux-unpacked/resources/app.asar`.

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@witchcraft/nuxt-electron/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/@witchcraft/nuxt-electron

[npm-downloads-src]: https://img.shields.io/npm/dm/@witchcraft/nuxt-electron.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npmjs.com/package/@witchcraft/nuxt-electron

[license-src]: https://img.shields.io/npm/l/@witchcraft/nuxt-electron.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/@witchcraft/nuxt-electron

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
