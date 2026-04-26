export function getPlatformIcon(platform: string): string {
  const lowerPlatform = platform.toLowerCase();

  if (lowerPlatform.includes("pc") || lowerPlatform.includes("windows")) {
    return "/platforms/windows.svg";
  }

  if (lowerPlatform.includes("playstation") || lowerPlatform.includes("ps4") || lowerPlatform.includes("ps5")) {
    return "/platforms/playstation.svg";
  }

  if (lowerPlatform.includes("xbox")) {
    return "/platforms/xbox.svg";
  }

  if (lowerPlatform.includes("nintendo") || lowerPlatform.includes("switch")) {
    return "/platforms/nintendo-switch.svg";
  }

  return "/platforms/game-controller.svg";
}
