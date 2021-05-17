let currentStatus = "inactive";
let activeTabsUrls = [];

browser.webRequest.onBeforeRequest.addListener(
  function (details) {
    if (currentStatus === "inactive" || !details.url.startsWith("http")) {
      return;
    }
    const url = new URL(details.url);
    if (
      activeTabsUrls.some((el) => {
        return el.origin === url.origin;
      })
    ) {
      return;
    }
    const encoded = window.btoa(details.url);
    return { redirectUrl: "open-this://" + encoded };
  },
  {
    urls: ["<all_urls>"],
    types: ["main_frame"],
  },
  ["blocking"]
);

async function updateFromStorage() {
  const data = await browser.storage.sync.get(["activeTabs", "status"]);
  activeTabsUrls = data.activeTabs.map((tab) => new URL(tab.url));
  currentStatus = data.status;
}

async function restoreTabs() {
  let currentTabs = await browser.tabs.query({});
  const currentTabsUrls = currentTabs.map((tab) => new URL(tab.url));
  const promises = [];
  for (const url of activeTabsUrls) {
    const isOpened = currentTabsUrls.find((tab) => tab.origin === url.origin);
    if (isOpened === undefined) {
      promises.push(
        browser.tabs.create({
          url: url.toString(),
          pinned: true,
        })
      );
    }
  }
  return Promise.all(promises);
}

// this function assumes all tabs are opened already
async function orderTabs() {
  let currentTabs = await browser.tabs.query({});
  for (let i = 0; i < activeTabsUrls.length; i++) {
    currentTabs.forEach((tab) => {
      const tabUrl = tab.url || tab.pendingUrl;
      const url = new URL(tabUrl);
      if (url.origin === activeTabsUrls[i].origin) {
        browser.tabs.move(tab.id, {
          index: i,
        });
      }
    });
  }
}

async function init() {
  await updateFromStorage();
  setTimeout(async () => {
    await restoreTabs();
    await orderTabs();
  }, 2000);
  browser.runtime.onStartup.addListener(restoreTabs);
  browser.storage.onChanged.addListener(updateFromStorage);
}

init();
