"use strict";

const ACTIVITY_UNDEFINED = -1;

// user-defined dictionary describing activity types
const DEFAULT_ACTIVITY_TYPES = {
  workRelated: {
    description: "Important work stuff",
    reward: 100,
  },
  properEntertainment: {
    description: "Good kind of entertainment: film, TV, music",
    reward: 5,
  },
  dumbEntertainment: {
    description: "Bad and harmful entertainment: instagram, youtube",
    reward: 1,
  },
  porn: {
    description: "Important work stuff",
    reward: 1,
  },
};

const DEFAULT_ACTIVITY_MATCHER = {
  "news.ycombinator.com": "workRelated",
  "habr.com": "workRelated",
  "twitch.tv": "dumbEntertainment",
  "youtube.com": "dumbEntertainment",
  "pornhub.com": "porn",
};

const config = {
  // mapping from activity id to activity info
  activityTypes: DEFAULT_ACTIVITY_TYPES,
  // mapping from regexp to activity id
  matcher: DEFAULT_ACTIVITY_MATCHER,
};

const calculateUrlType = (url) => {
  const urlDomain = new URL(url).hostname;
  const matchers = Object.keys(config.matcher);
  let at = config.matcher[urlDomain];
  if (at === undefined) {
    for (let matcher of matchers) {
      if (url.includes(matcher)) {
        at = config.matcher[matcher];
        break;
      }
    }
    if (at === undefined) return ACTIVITY_UNDEFINED;
  }
  return at;
};

const TRACKED_INFO_INITIAL = {
  // dictionary where a key is a Date representing a separate day and value
  // is a time table where every element represents a single period of time
  // using a particular website
  // value type:
  // from: Date,
  // to: Date,
  // pageInfo: {
  //  url: string,
  //  type: keyof activityTypes,
  // },
  timeArray: {},
};

let trackedInfo = TRACKED_INFO_INITIAL;

const currentDayDate = () => {
  const d = new Date(Date.now());
  d.setHours(0);
  d.setMinutes(0);
  d.setSeconds(0);
  d.setMilliseconds(0);
  return d;
};

const currDayTimeTable = () => {
  const cdd = currentDayDate();
  const ctt = trackedInfo.timeArray[cdd];
  if (ctt === undefined) {
    trackedInfo.timeArray[cdd] = [];
  }
  return trackedInfo.timeArray[cdd];
};

const currentWebsiteUrl = () => {
  const ctt = currDayTimeTable();
  if (ctt.length === 0) return null;
  return ctt[ctt.length - 1];
};

const trackUrl = (url) => {
  const ctt = currDayTimeTable();
  const currUrl = currentWebsiteUrl();
  // update the ending time of the previous record
  if (ctt.length !== 0) {
    ctt[ctt.length - 1].to = Date.now();
  }
  if (currUrl !== url) {
    ctt.push({
      from: Date.now(),
      to: Date.now(),
      pageInfo: {
        url,
        type: calculateUrlType(url),
      },
    });
  }
  chrome.storage.sync.set({ trackedInfo });
};

const onUpdateCurrentUrl = trackUrl;

const URL_SELECTION = [
  "https://news.ycombinator.com",
  "https://google.com",
  "https://habr.ru",
  "https://www.github.com",
];

const chooseRandom = (arr) => arr[Math.round(Math.random() * (arr.length - 1))];

const randomUrl = () => chooseRandom(URL_SELECTION);

const randomPages = (n, dateStart) => {
  let pages = [];
  const startHour = Math.round(Math.random() * 24);
  const endHour = Math.min(23, startHour + Math.round(Math.random() * 3));
  for (let i = 0; i < n; ++i) {
    pages.push({
      from: dateStart + startHour,
      to: dateStart + endHour,
      pageInfo: {
        url: randomUrl(),
      },
    });
  }
  return pages;
};

const randomTimeArray = (daysNum, entriesPerDay) => {
  let timeArray = {};
  for (let i = 0; i < daysNum; ++i) {
    const month = Math.round(Math.random() * 12);
    const day = Math.round(Math.random() * 30);
    const date = new Date(2019, month, day);
    timeArray[date] = randomPages(entriesPerDay, date);
  }
  console.log(timeArray);
  return timeArray;
};

const setup = () => {
  /* chrome.storage.sync.set({
   *   trackedInfo: {
   *     timeArray: randomTimeArray(3, 5),
   *   },
   * }); */

  // Fetch saved tracking info from chrome storage
  chrome.storage.sync.get("trackedInfo", (data) => {
    if (data.trackedInfo) {
      trackedInfo = data.trackedInfo;
    }
  });

  chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.url) {
      onUpdateCurrentUrl(changeInfo.url);
    }
  });
};

setup();
