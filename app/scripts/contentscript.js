window.addEventListener("beforeunload", function (event) {
  console.log("MensageIO is preventing this tab to close");
  event.preventDefault();
  event.returnValue = "";
});

const sidebarEl = document.createElement("div");

function initSidebar() {
  sidebarEl.id = "mensageio-sidebar-container";
  document.body.appendChild(sidebarEl);
}

async function renderSidebar(tabs) {
  console.log("from background", tabs);
  let html = "<ul class='mensageio-sidebar'>";
  for (const tab of tabs) {
    html += `
    <li class="mensageio-sidebar-icon ${tab.active ? "active" : ""}">
      <img class="mensageio-sidebar-icon-image" src="${tab.icon}" />
    </li>
  `;
  }
  html += "</ul>";
  sidebarEl.innerHTML = html;
}

async function init() {
  initSidebar();
  browser.runtime.sendMessage("service-ready");
}

browser.runtime.onMessage.addListener(renderSidebar);

init();
