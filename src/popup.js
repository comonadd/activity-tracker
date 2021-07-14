"use strict";

const openDashboard = () => {
  chrome.tabs.create({ 'url': chrome.runtime.getURL('build/dashboard.html') });
};

document.getElementById("open-dashboard").onclick = () => {
  openDashboard();
};
