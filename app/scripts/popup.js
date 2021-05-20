const button = document.getElementById("button-status");
const services = document.getElementById("services");

let state = {};

button.addEventListener("click", async () => {
  const value = await browser.storage.local.get(["status"]);
  const newValue = value.status === "active" ? "inactive" : "active";
  if (newValue === "active") {
    updateTabs();
  }
  await browser.storage.local.set({ status: newValue });
  updateState();
});

async function updateState() {
  state = await browser.storage.local.get();
  render();
}

function renderServices() {
  if (state && state.activeTabs) {
    let list = "";
    for (const tab of state.activeTabs) {
      list += `<li>
        <img src="${tab.icon}">
        ${tab.url}
        </li>`;
    }
    services.innerHTML = list;
  }
}

function render() {
  button.innerHTML = state.status || "Inactive";
  renderServices();
}
updateState();

browser.storage.onChanged.addListener(updateState);

async function updateTabs() {
  const tabs = await browser.tabs.query({});
  const tabsToSave = tabs.reduce((final, tab) => {
    if (!tab.url.startsWith("http")) {
      return final;
    }
    final.push({
      icon: tab.favIconUrl,
      url: tab.url,
    });
    return final;
  }, []);
  console.log("here", tabsToSave);
  try {
    await browser.storage.local.set({ activeTabs: tabsToSave });
  } catch (e) {
    console.log("error?", e);
  }
}
