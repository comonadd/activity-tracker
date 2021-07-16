import {
  DB_NAME,
  TRACK_INFO_STORE_NAME,
  ACTIVITY_UNDEFINED,
  DEFAULT_ACTIVITY_TYPES,
  DEFAULT_ACTIVITY_MATCHER,
} from "./constants";
import { calculateUrlType } from "./util";
import { openIDB } from "./db";
console.log('imported service worker');

const trackUrl = (state, url) => {
  state.dbHandle.then((db) => {
    const tx = db.transaction(TRACK_INFO_STORE_NAME, "readwrite");
    const store = tx.objectStore(TRACK_INFO_STORE_NAME);
    const item = {
      url,
      date: new Date().getTime(),
      type: calculateUrlType(state.config, url),
    };
    store.add(item);
    return tx.complete;
  });
};

const onUpdateCurrentUrl = trackUrl;

const setup = () => {
  let state = { config: DEFAULT_CONFIG };
  state.dbHandle = openIDB();
  window.indexedDB.open(DB_NAME, 1, );
  chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.url) {
      onUpdateCurrentUrl(state, changeInfo.url);
    }
  });
};

setup();
