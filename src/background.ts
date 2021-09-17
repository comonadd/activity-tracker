import {
  DB_NAME,
  TRACK_INFO_STORE_NAME,
  ACTIVITY_UNDEFINED,
  DEFAULT_ACTIVITY_TYPES,
  DEFAULT_ACTIVITY_MATCHER,
  DEFAULT_CONFIG,
} from "./constants";
import { calculateUrlType } from "./util";
import { addTrackedItem, openIDB } from "./db";
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
  const item = {
    url,
    created: new Date(),
    type: calculateUrlType(state.config, url),
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
