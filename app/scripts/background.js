import debounce from "debounce";

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

async function innerUpdateSidebar() {
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
      id: tab.id,
    });
  }
  if (!currentTab || !currentTab.id) {
    return;
  }
  try {
    await browser.tabs.sendMessage(currentTab.id, payload);
  } catch (e) {}
}
const updateSidebar = debounce(innerUpdateSidebar, 50);

async function handleMessage(message) {
  const { action } = message;
  switch (action) {
    case "service-ready":
      updateSidebar();
      break;
    case "switch-tab": {
      const { id } = message;
      try {
        browser.tabs.update(parseInt(id, 10), {
          active: true,
        });
        break;
      } catch (e) {}
    }
  }
}

// helper method to reload content scripts between addon re-installs
async function installContentScript() {
  const manifest = browser.runtime.getManifest();
  // iterate over all content_script definitions from manifest
  // and install all their js files to the corresponding hosts.
  const contentScripts = manifest.content_scripts;
  for (let i = 0; i < contentScripts.length; i++) {
    const contScript = contentScripts[i];
    const currentTabs = await browser.tabs.query({});
    for (const tab of currentTabs) {
      if (tab.url.startsWith("chrome://")) {
        continue;
      }
      const javaScripts = contScript.js;
      for (let k = 0; k < javaScripts.length; k++) {
        try {
          await browser.tabs.executeScript(tab.id, {
            file: javaScripts[k],
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
  }
}

function handleTabUpdate(_tabId, changed) {
  if (changed.favIconUrl) {
    updateSidebar();
  }
}

async function init() {
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
  browser.tabs.onUpdated.addListener(handleTabUpdate);
}

browser.runtime.onInstalled.addListener(installContentScript);
init();
console.log("background ready");
