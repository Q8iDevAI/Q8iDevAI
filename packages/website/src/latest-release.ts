import { getBlockingColdCache, type WebsiteCacheContext } from "./github-cache";

interface GitHubAsset {
  name: string;
}

export interface GitHubRelease {
  tag_name: string;
  assets: GitHubAsset[];
  prerelease: boolean;
  draft: boolean;
}

export interface ReleaseInfo {
  version: string;
  linuxAppImageAsset: string;
  windowsX64Asset: string | null;
  windowsArm64Asset: string | null;
}

export interface ReleaseChannels {
  stable: ReleaseInfo;
  /** The newest prerelease, or null when stable has caught up with it. */
  beta: ReleaseInfo | null;
}

const LINUX_APPIMAGE_ASSET_PATTERN =
  /^Q8iDevAI-(?:\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)-)?x86_64\.AppImage$/;

const REQUIRED_ASSET_PATTERNS = [
  /Q8iDevAI-.*-arm64\.dmg$/,
  LINUX_APPIMAGE_ASSET_PATTERN,
  /Q8iDevAI-Setup-.*\.exe$/,
];

const GITHUB_RELEASES_URL = "https://api.github.com/repos/Q8iDevAI/Q8iDevAI/releases?per_page=10";
const RELEASE_CACHE_KEY = "github-release:v2";
const ANDROID_RELEASE_CACHE_KEY = "github-android-release:v1";

const FALLBACK_RELEASE_CHANNELS: ReleaseChannels = {
  stable: {
    version: "0.8.0",
    linuxAppImageAsset: "Q8iDevAI-0.8.0-x86_64.AppImage",
    windowsX64Asset: "Q8iDevAI-Setup-0.8.0-x64.exe",
    windowsArm64Asset: "Q8iDevAI-Setup-0.8.0-arm64.exe",
  },
  beta: null,
};

function hasRequiredAssets(release: GitHubRelease): boolean {
  return REQUIRED_ASSET_PATTERNS.every((pattern) =>
    release.assets.some((asset) => pattern.test(asset.name)),
  );
}

function pickWindowsAssets(assets: GitHubAsset[]) {
  const x64Suffixed = assets.find((asset) => /Q8iDevAI-Setup-.*-x64\.exe$/.test(asset.name));
  const arm64 = assets.find((asset) => /Q8iDevAI-Setup-.*-arm64\.exe$/.test(asset.name));
  const legacy = assets.find(
    (asset) =>
      /Q8iDevAI-Setup-.*\.exe$/.test(asset.name) &&
      !asset.name.endsWith("-x64.exe") &&
      !asset.name.endsWith("-arm64.exe"),
  );
  return {
    x64: (x64Suffixed ?? legacy)?.name ?? null,
    arm64: arm64?.name ?? null,
  };
}

function pickLinuxAppImageAsset(assets: GitHubAsset[]) {
  return assets.find((asset) => LINUX_APPIMAGE_ASSET_PATTERN.test(asset.name))?.name ?? null;
}

function versionFromTag(tag: string): string {
  return tag.replace(/^v/, "");
}

async function fetchGitHubReleases(): Promise<GitHubRelease[]> {
  try {
    const response = await fetch(GITHUB_RELEASES_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "q8idevai-website",
      },
    });
    if (!response.ok) return [];
    return (await response.json()) as GitHubRelease[];
  } catch {
    return [];
  }
}

function toReleaseInfo(release: GitHubRelease): ReleaseInfo | null {
  if (release.draft || !hasRequiredAssets(release)) return null;

  const linuxAppImageAsset = pickLinuxAppImageAsset(release.assets);
  if (!linuxAppImageAsset) return null;

  const windowsAssets = pickWindowsAssets(release.assets);
  return {
    version: versionFromTag(release.tag_name),
    linuxAppImageAsset,
    windowsX64Asset: windowsAssets.x64,
    windowsArm64Asset: windowsAssets.arm64,
  };
}

function coreVersion(version: string): number[] {
  return version.split("-")[0].split(".").map(Number);
}

/**
 * A beta is only worth offering while its core version is ahead of stable.
 * Promotion ships the same core as a stable release, which retires the beta
 * channel until the next beta line opens.
 */
function leadsStable(betaVersion: string, stableVersion: string): boolean {
  const beta = coreVersion(betaVersion);
  const stable = coreVersion(stableVersion);
  for (let index = 0; index < Math.max(beta.length, stable.length); index++) {
    const betaPart = beta[index] ?? 0;
    const stablePart = stable[index] ?? 0;
    if (betaPart !== stablePart) return betaPart > stablePart;
  }
  return false;
}

export function selectReleaseChannels(releases: GitHubRelease[]): ReleaseChannels {
  const stable = releases
    .filter((release) => !release.prerelease)
    .map(toReleaseInfo)
    .find((release) => release !== null);
  if (!stable) return FALLBACK_RELEASE_CHANNELS;

  const beta = releases
    .filter((release) => release.prerelease)
    .map(toReleaseInfo)
    .find((release) => release !== null);

  return { stable, beta: beta && leadsStable(beta.version, stable.version) ? beta : null };
}

async function fetchReleaseChannels(): Promise<ReleaseChannels> {
  try {
    return selectReleaseChannels(await fetchGitHubReleases());
  } catch {
    return FALLBACK_RELEASE_CHANNELS;
  }
}

export function getLatestAndroidVersionFromReleases(releases: GitHubRelease[]): string {
  const release = releases.find((candidate) => {
    if (candidate.prerelease || candidate.draft) return false;
    const version = versionFromTag(candidate.tag_name);
    if (!/^\d+\.\d+\.\d+$/.test(version)) return false;
    return candidate.assets.some(
      (asset) => asset.name === `q8idevai-${candidate.tag_name}-android.apk`,
    );
  });
  if (!release) return "0.8.0";
  return versionFromTag(release.tag_name);
}

async function fetchLatestAndroidVersion(): Promise<string> {
  try {
    return getLatestAndroidVersionFromReleases(await fetchGitHubReleases());
  } catch {
    return "0.8.0";
  }
}

function isAndroidVersion(value: unknown): value is string {
  return typeof value === "string" && /^\d+\.\d+\.\d+$/.test(value);
}

function isReleaseInfo(value: unknown): value is ReleaseInfo {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.version === "string" &&
    /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(record.version) &&
    typeof record.linuxAppImageAsset === "string" &&
    (record.linuxAppImageAsset === "Q8iDevAI-x86_64.AppImage" ||
      new RegExp(`^Q8iDevAI-${record.version.replaceAll(".", "\\.")}-x86_64\\.AppImage$`).test(
        record.linuxAppImageAsset,
      )) &&
    (typeof record.windowsX64Asset === "string" || record.windowsX64Asset === null) &&
    (typeof record.windowsArm64Asset === "string" || record.windowsArm64Asset === null) &&
    (record.windowsX64Asset === null ||
      new RegExp(`^Q8iDevAI-Setup-${record.version.replaceAll(".", "\\.")}(?:-x64)?\\.exe$`).test(
        record.windowsX64Asset,
      )) &&
    (record.windowsArm64Asset === null ||
      new RegExp(`^Q8iDevAI-Setup-${record.version.replaceAll(".", "\\.")}-arm64\\.exe$`).test(
        record.windowsArm64Asset,
      ))
  );
}

function isReleaseChannels(value: unknown): value is ReleaseChannels {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return isReleaseInfo(record.stable) && (record.beta === null || isReleaseInfo(record.beta));
}

export async function getReleaseChannels(context: WebsiteCacheContext): Promise<ReleaseChannels> {
  return getBlockingColdCache({
    context,
    key: RELEASE_CACHE_KEY,
    isValue: isReleaseChannels,
    fetchFresh: fetchReleaseChannels,
  });
}

export async function getLatestAndroidVersion(context: WebsiteCacheContext): Promise<string> {
  return getBlockingColdCache({
    context,
    key: ANDROID_RELEASE_CACHE_KEY,
    isValue: isAndroidVersion,
    fetchFresh: fetchLatestAndroidVersion,
  });
}
