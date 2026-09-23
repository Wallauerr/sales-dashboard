interface VersionsApi {
  node: () => string;
  chrome: () => string;
  electron: () => string;
  ping: () => Promise<string>;
}

interface Window {
  versions: VersionsApi;
}
