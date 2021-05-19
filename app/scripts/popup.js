const button = document.getElementById("button-status");
const services = document.getElementById("services");

button.addEventListener("click", async () => {
  const value = await browser.storage.sync.get(["status"]);
  const newValue = value.status === "active" ? "inactive" : "active";
  if (newValue === "active") {
    updateTabs();
  }
  await browser.storage.sync.set({ status: newValue });
  updateState();
});

let state = {};

async function updateState() {
  state = await browser.storage.sync.get();
  render();
}

function renderServices() {
  if (state && state.activeTabs) {
    let list = "";
    for (const tab of state.activeTabs) {
      list += `<li>${tab.url}</li>`;
    }
    services.innerHTML = list;
  }
}

function render() {
  button.innerHTML = state.status || "loading";
  renderServices();
}

browser.storage.onChanged.addListener(updateState);

updateState();

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
