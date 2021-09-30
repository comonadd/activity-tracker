import { DEFAULT_CONFIG } from "./constants";
import { Configuration, calculateUrlType } from "~/configuration";
import { reportNoActivityMatcher } from "~/userLog";
import { addTrackedItem } from "~/trackedRecord";
import { DbHandle, openIDB } from "./db";
import extAPI from "./extAPI";

interface TrackerState {
  config: Configuration<any>;
  dbHandle: DbHandle;
}

const state: TrackerState = {
  config: null,
  dbHandle: null,
};

const shouldIgnoreUrl = (url: string) => {
  if (!state.config.urlIgnorePattern) return false;
  const rxp = new RegExp(state.config.urlIgnorePattern);
  return rxp.test(url);
};

const trackUrl = async (url: string) => {
  if (shouldIgnoreUrl(url)) return;
  const t = calculateUrlType(state.config, url);
  if (t === null) {
    const uu = new URL(url);
    url = uu.origin + uu.pathname;
    await reportNoActivityMatcher(url);
  }
  const item = {
    url,
    created: new Date(),
    type: t,
    duration: 0,
  };
  await addTrackedItem(item);
};

const subcribeToExtStorageChangesOf = <T>(
  key: string,
  listener: (c: T) => void
) => {
  chrome.storage.onChanged.addListener((changes, area) => {
    const newValue = (changes[key] as any).newValue;
    if (area === "sync" && newValue) {
      listener(newValue);
    }
  });
};

const tabListener = (tabId: number, changeInfo: { url: string }, tab: any) => {
  if (changeInfo.url) {
    trackUrl(changeInfo.url);
  }
};

const setup = async () => {
  extAPI.storage.sync.get("tracker-config", (storageData) => {
    let config = storageData["tracker-config"];
    if (!config) {
      extAPI.storage.sync.set({ "tracker-config": DEFAULT_CONFIG });
      config = DEFAULT_CONFIG;
    }
    state.config = config;
  });
  state.dbHandle = await openIDB();
  subcribeToExtStorageChangesOf<Configuration<any>>(
    "tracker-config",
    (config) => {
      state.config = config;
    }
  );
  extAPI.tabs.onUpdated.addListener(tabListener);

  extAPI.browserAction.onClicked.addListener(function (tab) {
    extAPI.tabs.create({ url: extAPI.runtime.getURL("./dashboard.html") });
  });
};

setup();
