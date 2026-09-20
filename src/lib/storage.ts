import localforage from "localforage";

const driverOrder = [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE];

export const authStorage = localforage.createInstance({
  name: "ani-console",
  storeName: "auth",
  driver: driverOrder,
});

export const oidcStorage = localforage.createInstance({
  name: "ani-console",
  storeName: "oidc",
  driver: driverOrder,
});

const LEGACY_AUTH_KEY = "ani-console-auth";

export async function migrateLegacyAuthStorage(): Promise<void> {
  if ((await authStorage.getItem<string>(LEGACY_AUTH_KEY)) !== null) return;

  let legacyValue: string | null = null;
  try {
    legacyValue = window.localStorage.getItem(LEGACY_AUTH_KEY);
  } catch {
    return;
  }
  if (legacyValue === null) return;

  await authStorage.setItem(LEGACY_AUTH_KEY, legacyValue);
  try {
    window.localStorage.removeItem(LEGACY_AUTH_KEY);
  } catch {
    // The migrated value is already available through localForage.
  }
}
