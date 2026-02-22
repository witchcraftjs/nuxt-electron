{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
    systems.url = "github:nix-systems/default";
    devenv = {
      url = "github:cachix/devenv";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    # does not follow anything
    flake-utils.url = "github:numtide/flake-utils";
    utils = {
      url = "github:alanscodelog/nix-devenv-utils";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };
  nixConfig = {
    extra-trusted-public-keys = "devenv.cachix.org-1:w1cLUi8dv3hnoSPGAuibQv+f9TZLr6cv/Hm9XgU50cw=";
    extra-substituters = "https://devenv.cachix.org";
  };
  outputs =
    { self
    , nixpkgs
    , devenv
    , systems
    , utils
    , ...
    } @ inputs:
    let
      forEachSystem = nixpkgs.lib.genAttrs (import systems);
    in
    {

      devShells = forEachSystem
        (system:
          let
            overlay = final: prev: { };
            pkgs = import nixpkgs {
              inherit system;
              overlays = [ overlay ];
            };
          in
          {
            default = devenv.lib.mkShell {
              inherit inputs pkgs;
              modules =
                let
                in
                [
                  utils.devenvModule
                  ({ pkgs, config, ... }: {
                    custom.js.nodejs.package = pkgs.nodejs_24;
                    custom.electron.enabled = true;
                    custom.electron.package = pkgs.electron_37-bin;
                    scripts.debugNixBuild = {
                      exec = ''
                        nix develop .#packages.${system}.default --ignore-environment
                      '';
                      description = ''
                        Debug the nix build. Once in the shell run: genericBuild or run each phase individually: [unpackPhase configurePhase eval "$buildPhase" installPhase]
                      '';
                    };
                  })
                ];
            };
          });
      packages = forEachSystem (system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          devenv-up = self.devShells.${system}.default.config.procfileScript;
          devenv-test = self.devShells.${system}.default.config.test;
          default = pkgs.callPackage ./playground/nix/derivation.nix {
            node_package = pkgs.nodejs_24;
            pnpm_package = pkgs.pnpm;
            electron_package = pkgs.electron_37-bin;
          };
        });
    };
}
