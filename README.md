# mensageio

This web extension will turn your browser into a dedicated communication hub, similar to other tools like [Ferdi](https://getferdi.com/), [Rambox](https://rambox.app/) and many others.

The main difference is that this extension works as an extension that doesn't use much or any additional cpu and memory, it allows you to keep control of your browser extensions and other functionalities you like.

## Install

Due to this being a browser extension, it is not as convenient to install as a single click and run app.

The installation require two parts: Browser and Native configuration.

### Browser and extension

Important: you should use a dedicated browser profile for this extension, or simply a dedicated browser itself. Chromium is recommended.

- [Download chromium](https://www.chromium.org/getting-involved/download-chromium). Better if you don't log in into any google account.
- Install this extension
- Setup your communications as desired: whatsapp, gmail, calendar, slack, etc... as you'd do in your regular browser.
- Activate MensageIO, click in the icon (next to the address bar). Click the "inactive" button. It will turn green. Latest chromium versions will collapse all icons inside the extension icons, It is recommended you pin the logo.

While the extension is active you won't be able to open new tabs and any external link will invoke a custom protocol `open-this://`. The next section will show you how to install the necessary to handle this custom protocol.

### Custom Protocol

**This is a work in progress.**

While the extension is in 'active' mode. It will send any click to an external link to a custom protocol like this: `open-this://[base64-encoded-url]`

Each OS has a different way of handling custom protocols. I'll update this section as I finish a distributable script to handle it.

## Development

Contributions are welcome. Clone this repo, then

```bash
yarn
yarn dev chrome #(or firefox)
```

## Build

```bash
yarn run build chrome
yarn run build firefox
```
