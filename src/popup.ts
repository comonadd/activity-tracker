import extAPI from "./extAPI";

const openDashboard = () => {
  extAPI.tabs.create({ url: extAPI.runtime.getURL("./dashboard.html") });
};

document.getElementById("open-dashboard").onclick = () => {
  openDashboard();
};
