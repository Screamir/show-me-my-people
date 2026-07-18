# Show Me My People! 🫂

> Shows your own follower count right on your pixiv profile page — for the extra lazy.

Pixiv doesn't display your follower count on your profile. Normally you'd have to
click into your followers page to see it. This tiny userscript adds a **"Followers"**
link with the live count right next to the native **"Following"** counter on your
profile header — so you never have to make that one exhausting click again.

## Install

1. Install a userscript manager: [Tampermonkey](https://www.tampermonkey.net/),
   [Violentmonkey](https://violentmonkey.github.io/), or Greasemonkey.
2. Install the script:
   - **Greasy Fork:** *(link once published)*
   - **GitHub:** [show-me-my-people.user.js](https://raw.githubusercontent.com/steven/show-me-my-people/main/show-me-my-people.user.js)

## Features

- 🎯 **Native look** — clones pixiv's own counter and matches the site's styling exactly.
- ⚡ **Instant, zero extra requests on your own profile** — the number is read straight
  from data already on the page.
- 🧭 **Client-side navigation** — uses pixiv's own router, as fast as the built-in
  buttons (no full reload). Ctrl/⌘/middle-click still open a new tab.
- 🌗 **Theme-aware** — recolors correctly when switching light/dark themes.
- 🌍 **Works everywhere** — all interface languages and the mobile web layout.
- 🤖 **Captcha-friendly** — never spams requests; at most one cached request per user,
  and none at all on your own profile.

## How it works

The script waits for your profile header to render, then inserts a "Followers" link
mirroring the native "Following" element. On your own profile the count comes from data
already loaded in the page (no network call); on other users' profiles it makes a single
cached request to pixiv's public followers endpoint.

## Notes

- The count reflects **public** followers (the same number pixiv itself exposes).
- No data is collected or sent anywhere — everything runs locally in your browser.

## License

[MIT](LICENSE)