{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    devenv.inputs.nixpkgs.follows = "nixpkgs";
    systems.url = "github:nix-systems/default";
    devenv.url = "github:cachix/devenv";
  };

  nixConfig = {
    extra-trusted-public-keys = "devenv.cachix.org-1:w1cLUi8dv3hnoSPGAuibQv+f9TZLr6cv/Hm9XgU50cw=";
    # this must be configured in /etc/nix/nix.conf
    # see https://nix.dev/manual/nix/2.18/command-ref/conf-file#conf-substituters
    extra-substituters = "https://devenv.cachix.org";
  };

  outputs = { self, nixpkgs, devenv, systems, ... } @ inputs:
    let
      forEachSystem = nixpkgs.lib.genAttrs (import systems);
    in
    {
      packages = forEachSystem (system: {
        devenv-up = self.devShells.${system}.default.config.procfileScript;
      });

      devShells = forEachSystem
        (system:
          let
            pkgs = import nixpkgs
              {
                inherit system;
                config = { };
              };
          in
          let
            dir = "";
            cwd = builtins.getEnv "PWD" + "/" + dir;
          in
          {
            default = devenv.lib.mkShell {
              inherit inputs pkgs;

              modules =
                [
                  ({ pkgs, ... }:
                    let
                      electron = pkgs.electron_34-bin;
                    in
                    {
                      packages = [
                        electron
                      ];
                      env.TERM = "wezterm";
                      env.ELECTRON_SKIP_BINARY_DOWNLOAD = "1";
                      env.ELECTRON_OVERRIDE_DIST_PATH = "${electron}/bin/";

                      scripts.devInfo = {
                        description = "Prints out some information about the environment.";
                        exec = ''
                          echo "Environment Package Versions:"
                          echo "node `${pkgs.nodejs_24}/bin/node --version`"
                          echo "electron `${electron}/bin/electron --version`"
                        '';
                      };
                    })
                ];
            };

          });
    };
}
