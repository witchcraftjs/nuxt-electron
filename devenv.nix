{ inputs, pkgs, lib, config, ... }:

{
  imports = [ inputs.utils.devenvModule ];

  overlays = [
    (final: prev: {
      playwright-test = inputs.playwright.packages.${prev.system}.playwright-test;
      playwright-driver = inputs.playwright.packages.${prev.system}.playwright-driver;
    })
  ];

  custom.js.nodejs.package = pkgs.nodejs_24;
  custom.js.pnpm.package = inputs.nixpkgs-unstable.legacyPackages.${pkgs.system}.pnpm;
  custom.js.setupPlaywright = true;
  custom.js.playwrightDriverPackage = pkgs.playwright-driver;
  custom.electron.enabled = true;
  custom.electron.package = pkgs.electron_44-bin;

  # user has this set globally sometimes, it must NOT be set for things to function correctly inside devenv
  env.ELECTRON_RUN_AS_NODE = "";

  processes.nuxt = {
    ports.http.allocate = 3000;
    exec = ''NUXT_PORT=${toString config.processes.nuxt.ports.http.value} pnpm test:server --port ${toString config.processes.nuxt.ports.http.value}'';
  };

  scripts = {
    getPortNuxt = {
      exec = ''
        exec_output=$(devenv processes list "$@" 2>/dev/null | grep nuxt | tail -c 5)

        echo "$exec_output"
        if [ -z "$exec_output" ]; then
            echo "Error: Output is blank" >&2
            exit 1
        fi
      '';
    };
  };
}
