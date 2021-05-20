window.addEventListener("beforeunload", function (event) {
  event.preventDefault();
  event.returnValue = "";
});

const current =
  "men-" + window.crypto.getRandomValues(new Uint32Array(1))[0].toString();
console.log("running content script", current);

const sidebarEl = document.createElement("div");
sidebarEl.classList.add(current);

async function switchTab(event) {
  const target = event.target;
  const element = target.closest("li");
  if (element.dataset.tabId) {
    try {
      await browser.runtime.sendMessage({
        action: "switch-tab",
        id: element.dataset.tabId,
      });
    } catch (e) {}
  }
}

function initSidebar() {
  sidebarEl.id = "mensageio-sidebar-container";
  document.body.appendChild(sidebarEl);
  sidebarEl.addEventListener("click", switchTab);
}

async function renderSidebar(tabs) {
  let html = "<ul class='mensageio-sidebar'>";
  for (const tab of tabs) {
    html += `
    <li data-tab-id=${tab.id} 
      class="mensageio-sidebar-icon ${tab.active ? "active" : ""}"
    >
      <img class="mensageio-sidebar-icon-image" src="${tab.icon}" />
    </li>
  `;
  }
  html += "</ul>";
  sidebarEl.innerHTML = html;
}

function handleMessage(message) {
  if (message === "cleanup") {
    return cleanUp();
  }
  renderSidebar(message);
}

async function init() {
  const event = new CustomEvent("cleanup-mensage-io", {
    detail: { current },
  });
  window.dispatchEvent(event);
  browser.runtime.onMessage.addListener(handleMessage);
  initSidebar();
  browser.runtime.sendMessage({ action: "service-ready" });
}

window.addEventListener("cleanup-mensage-io", cleanUp);

function cleanUp(event) {
  if (event.detail.current === current) {
    return;
  }
  console.log("cleaning up content scripts", current);
  browser.runtime.onMessage.removeListener(renderSidebar);
  browser.runtime.onMessage.removeListener(handleMessage);
  const element = document.querySelector("." + current);
  if (element) {
    element.removeEventListener("click", switchTab);
    element.remove();
  }
  window.removeEventListener("cleanup-mensage-io", cleanUp);
}

init();
