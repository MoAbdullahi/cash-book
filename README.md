# Daily cash book

A shared daily record of sales and expenses in Kenyan shillings, for Mohamed
Transport. One link for everyone: four editors enter the day's figures with
their own PIN, and everyone else reads. Nobody needs an account.

The running total restarts at zero on the first day of every month, so no
month carries the one before it.

## Setting it up on Cloudflare

**1. Create the storage.** In the Cloudflare dashboard, go to
*Storage & Databases → KV → Create a namespace* and name it `cashbook`.
Copy the namespace ID it shows you.

**2. Point the config at it.** Open `wrangler.toml` in this repo and replace
`PASTE_YOUR_KV_NAMESPACE_ID_HERE` with that ID. Leave `binding = "BOOK"`
exactly as it is — the code looks for that name.

**3. Connect the repo.** In the dashboard, go to *Workers & Pages → Create →
Import a repository*, choose this repo, and deploy. Every push to `main`
redeploys the worker from then on.

You will get a link ending in `.workers.dev`. That one link is what both the
editors and the viewers use.

## The four editors

The names and PINs live at the top of `src/index.js`:

```js
const EDITORS = [
  { name: "Mo",    pin: "4417" },
  ...
];
```

Change all four PINs before sending the link to anyone — the ones committed
here were written in a chat and should be treated as public. Send each person
their own PIN privately, one to one. The page records who entered each day,
which only means anything if the PINs are not passed around.

PINs are checked on Cloudflare's server, not in the browser, so reading the
page source gives nothing away. Anyone who has a PIN can edit, so a PIN that
leaks is the whole of the protection gone — change it here and push.

## Adding a day

Open the link, enter your PIN once, then fill in the date, total sales and
cash out. Saving a date that is already in the book replaces that day's
figures. Each editor's name is saved against every day they enter.

## What is in the book already

Twenty-five days, 7 September to 5 October 2026, carried over from the
earlier version of this book. September closed at KSh 368,908. October stood
at KSh 63,450 through 5 October.
