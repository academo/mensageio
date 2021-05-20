const state = {
  currentStatus: "",
  activeTabsUrls: [],
};

function captureWebRequests() {
  browser.webRequest.onBeforeRequest.addListener(
    function (details) {
      if (
        state.currentStatus === "inactive" ||
        !details.url.startsWith("http")
      ) {
        return;
      }
      const url = new URL(details.url);
      // allow current tabs to reload or load its own resources in a main frame
      if (
        state.activeTabsUrls.some((el) => {
          return el.origin === url.origin;
        })
      ) {
        return;
      }

      // everything else goes through the open-this protocol
      const encoded = window.btoa(details.url);
      return { redirectUrl: "open-this://" + encoded };
    },
    {
      urls: ["<all_urls>"],
      types: ["main_frame"],
    },
    ["blocking"]
  );
}

function preventNewTabListener() {
  // prevent new tabs created by mistake by the user
  let timesNewTabTried = 0;
  let timesNewTabTriedTimer = 0;
  browser.tabs.onCreated.addListener((tab) => {
    if (
      state.currentStatus === "active" &&
      tab.pendingUrl.startsWith("chrome://newtab")
    ) {
      clearInterval(timesNewTabTriedTimer);
      timesNewTabTriedTimer = setInterval(() => {
        timesNewTabTried = 0;
      }, 2000);

      // if the user tries more than 3 times to open a new tab
      // show the extension popup to remind them is active
      if (timesNewTabTried >= 2) {
        browser.browserAction.openPopup();
      }
      timesNewTabTried++;
      browser.tabs.remove(tab.id);
    }
  });
}

async function updateState() {
  const data = await browser.storage.local.get(["activeTabs", "status"]);
  data.activeTabs = data.activeTabs || [];
  state.activeTabsUrls = data.activeTabs.map((tab) => new URL(tab.url));
  state.currentStatus = data.status;
}

async function restoreTabs() {
  const currentTabs = await browser.tabs.query({});
  const currentTabsUrls = currentTabs.map(
    (tab) => new URL(tab.url || tab.pendingUrl)
  );
  const promises = [];
  for (const url of state.activeTabsUrls) {
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

//async function preventTabClosing(tabId, tabStatus) {
//if (tabStatus && tabStatus.status !== "complete") {
//return;
//}

//try {
//await browser.tabs.executeScript(tabId, {
//code: `
//window.addEventListener("beforeunload", function(event) {
//console.log('MensageIO is preventing this tab to close')
//event.preventDefault();
//event.returnValue = '';
//})
//`,
//});
//} catch (e) {}
//}

//// this function assumes all tabs are opened already
//async function orderTabs() {
//let currentTabs = await browser.tabs.query({});
//console.log(currentTabs);
//for (let i = 0; i < activeTabsUrls.length; i++) {
//console.log("checking", activeTabsUrls[i]);
//currentTabs.forEach((tab) => {
//const tabUrl = tab.url || tab.pendingUrl;
//const url = new URL(tabUrl);
//if (url.origin === activeTabsUrls[i].origin) {
//console.log("found", tab);
//browser.tabs.move(tab.id, {
//index: -1,
//});
//}
//});
//}
//}

async function updateSidebar() {
  const currentTabs = await browser.tabs.query({});
  const payload = [];
  let currentTab;
  for (const tab of currentTabs) {
    if (!tab.id || tab.url.startsWith("chrome://")) {
      continue;
    }

    if (tab.active) {
      currentTab = tab;
    }
    payload.push({
      icon: tab.favIconUrl,
      active: tab.active,
    });
  }
  if (!currentTab || !currentTab.id) {
    return;
  }
  try {
    await browser.tabs.sendMessage(currentTab.id, payload);
  } catch (e) {}
}

function handleMessage(message) {
  if (message === "service-ready") {
    console.log("got ready");
    updateSidebar();
  }
}

async function init() {
  //browser.tabs.onUpdated.addListener(preventTabClosing);
  browser.runtime.onMessage.addListener(handleMessage);
  captureWebRequests();
  preventNewTabListener();
  await updateState();
  // a timeout to give the browser time to finish initializing tabs
  setTimeout(async () => {
    await restoreTabs();
  }, 2000);
  browser.storage.onChanged.addListener(updateState);
  browser.tabs.onActivated.addListener(updateSidebar);
}

init();
