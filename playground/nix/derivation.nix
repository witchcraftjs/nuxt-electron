# This template needs a few adaptations to work in a real project as currently it's setup to work with the playground.
# Search for CHANGE to find the changes you'd need to make.
# To debug run debugNixBuild (see the root flake script).
# Then run genericBuild
# or the individual steps:
# unpackPhase
# configurePhase
# eval "$buildPhase"
# installPhase
{ pkgs
, node_package
, pnpm_package
, electron_package
}:

let
  # we need the root because it has the lock file and playground is a workspace project
  src = ../../.;
  # CHANGE to:
  # src = ../.;
  packageJson = builtins.fromJSON (builtins.readFile ../package.json);
  pname = "your-app-name";
  version = packageJson.version;
  desktopItem = pkgs.makeDesktopItem {
    name = pname;
    exec = pname;
    icon = pname;
    desktopName = "Your App Name";
    genericName = "Electron App";
    categories = [ "Utility" ];
    startupWMClass = pname;
  };
in
pkgs.stdenv.mkDerivation {
  inherit pname version src;

  nativeBuildInputs = [
    pnpm_package.configHook
    node_package
    pkgs.makeWrapper
  ];

  pnpmDeps = pkgs.pnpm.fetchDeps {
    inherit pname version src;
    hash = "sha256-xPP0JRyRlAnnhvW+HanJNvw+8yAyK4tQTKrxk+FlC/o="; # CHANGE -
    fetcherVersion = 1;
  };

  env = {
    ELECTRON_SKIP_BINARY_DOWNLOAD = "1";
    # prevent nuxt asking to confirm telemetry
    # and overall funciton like a CI
    CI = "true";
    BUILD_OUTPUT = ".dist/electron";
    PNPM_CONFIG_NEVER_BUILT_DEPENDENCIES = "oxc-minify";
  };

  buildPhase = ''
    # we depend on ourselves so we have to build the nuxt-electron package
    pnpm nuxt prepare
    pnpm build:only
    cd playground
    # CHANGE - remove all the above
    pnpm nuxt prepare
    pnpm build:electron:no-pack
  '';
  installPhase = ''
    set -xe
    runHook preInstall

    # we're going to recreate the structure inside of .dist/electron
    # .dist/electron/build => $OUT/electron/build
    # .dist/electron/.output => $OUT/electron/.output
    # then we need to add the node_modules next to the build dir
    # node_modules => $OUT/electron/build/node_modules

    OUT="$out/share/${pname}"
    NODE_MODULES_OUT="$OUT/electron/build/node_modules"
    ICON_DIR="/path/to/icons"

    mkdir -p "$OUT"
    cp -rv .dist/electron "$OUT/"

    # COPY DEPS

    # in this case we cd'd into playground and we need the root node_modules hence the ../
    cp -rP ../node_modules "$NODE_MODULES_OUT"
    # CHANGE - replace with
    # cp -rP node_modules "$NODE_MODULES_OUT"

    # CHANGE - remove this line, it's to clean symlinks because of how the  playground is setup
    find "$NODE_MODULES_OUT" -xtype l -delete || true

    # COPY DESKTOP FILE
    mkdir -p $out/share/applications
    cp ${desktopItem}/share/applications/* $out/share/applications/

    # COPY ICONS if they exist
    if [ -d "$ICON_DIR" ]; then
      for icon in "$ICON_DIR/*.png"; do
        size=$(basename "$icon" .png)
        mkdir -p "$out/share/icons/hicolor/$size/apps"
        ln -s "$icon" "$out/share/icons/hicolor/$size/apps/${pname}.png"
      done
    fi

    # CREATE FINAL WRAPPER
    makeWrapper ${electron_package}/bin/electron $out/bin/${pname} \
      --chdir "$OUT/electron/build" \
      --add-flags "$OUT/electron/build/main.mjs" \
      --add-flags "--preserve-symlinks" \
      --add-flags "\''${WAYLAND_DISPLAY:+--ozone-platform-hint=auto --enable-features=WaylandWindowDecorations}"

    runHook postInstall
    set +xe
  '';
}

