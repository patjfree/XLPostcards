{ pkgs }: {
  deps = [
    pkgs.sudo
    pkgs.nodejs-20_x
    pkgs.jdk17
    pkgs.gradle
    pkgs.android-tools
    pkgs.android-studio
    pkgs.android-sdk
    pkgs.android-sdk-platform-tools
    pkgs.android-sdk-build-tools
    pkgs.android-sdk-platform
  ];
}
