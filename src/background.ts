import {
  DB_NAME,
  TRACK_INFO_STORE_NAME,
  ACTIVITY_UNDEFINED,
  DEFAULT_ACTIVITY_TYPES,
  DEFAULT_ACTIVITY_MATCHER,
  DEFAULT_CONFIG,
} from "./constants";
import { calculateUrlType } from "./util";
import {
  UserLogMessageType,
  saveUserLogMessage,
  addTrackedItem,
  openIDB,
} from "./db";
import { Configuration, DbHandle } from "./types";
import extAPI from "./extAPI";

interface TrackerState {
  config: Configuration<any>;
  dbHandle: DbHandle;
}

let state: TrackerState = {
  config: null,
  dbHandle: null,
};

const shouldIgnoreUrl = (url: string) => {
  const rxp = new RegExp(state.config.urlIgnorePattern);
  return rxp.test(url);
};

const trackUrl = async (url: string) => {
  if (shouldIgnoreUrl(url)) return;
  const t = calculateUrlType(state.config, url);
  const uu = new URL(url);
  url = uu.origin + uu.pathname;
  if (t === null) {
    saveUserLogMessage(state.dbHandle, {
      type: UserLogMessageType.Warning,
      msg: `No activity matcher for path found: "${url}"`,
    });
  }
  const item = {
    url,
    created: new Date(),
    type: t,
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
};

setup();
