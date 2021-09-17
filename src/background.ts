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

interface TrackerState {
  config: Configuration<any>;
  dbHandle: DbHandle;
}

const urlIgnoreRegexp = /chrome:\/\/.*/;
const shouldIgnoreUrl = (url: string) => {
  return urlIgnoreRegexp.test(url);
};

const trackUrl = async (state: TrackerState, url: string) => {
  if (shouldIgnoreUrl(url)) return;
  const t = calculateUrlType(state.config, url);
  if (t === null) {
    saveUserLogMessage(state.dbHandle, {
      type: UserLogMessageType.Warning,
      msg: `No activity matcher for url found: "${url}"`,
    });
  }
  const item = {
    url,
    created: new Date(),
    type: t,
  };
  await addTrackedItem(state.dbHandle, item);
};

const setup = async () => {
  const state: TrackerState = {
    config: DEFAULT_CONFIG,
    dbHandle: await openIDB(),
  };
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
      trackUrl(state, changeInfo.url);
    }
  });
};

setup();
