"use strict";

const items = document.querySelector(".items");

// maybe sort by date before showing

chrome.storage.sync.get("trackedInfo", (data) => {
  console.log("what we have");
  console.log(data);
  const { trackedInfo } = data;
  const ta = trackedInfo.timeArray;
  for (let day in ta) {
    const dayRecords = ta[day];
    const content = `<div class="day">
<div class="day__title">${day}</div>
${dayRecords
  .map((record) => {
    return `<div class="day__record">${record.pageInfo.url}</div>`;
  })
  .join("")}
</div>`;
    items.innerHTML += content;
  }
});
