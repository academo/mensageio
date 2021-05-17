const button = document.getElementById("button-status");

button.addEventListener("click", async () => {
  const value = await browser.storage.sync.get(["status"]);
  const newValue = value.status === "active" ? "inactive" : "active";
  if (newValue === "active") {
    updateTabs();
  }
  await browser.storage.sync.set({ status: newValue });
  updateButtonStatus();
});

browser.storage.onChanged.addListener(updateButtonStatus);

async function updateButtonStatus() {
  const value = await browser.storage.sync.get(["status"]);
  button.innerHTML = value.status || "loading";
}

updateButtonStatus();

async function updateTabs() {
  const tabs = await browser.tabs.query({});
  const tabsToSave = tabs.reduce((final, tab) => {
    if (!tab.url.startsWith("http")) {
      return final;
    }
    final.push({
      url: tab.url,
    });
    return final;
  }, []);
  browser.storage.sync.set({ activeTabs: tabsToSave });
}
