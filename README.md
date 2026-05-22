# RegExe

A browser extension for Zen Browser (Firefox-based) that provides regex-powered find-in-page functionality. It adds a custom search bar with JavaScript RegExp support, match highlighting, color customization, and content copying.

## Features

- **Regex search** -- toggle a checkbox to parse input as JavaScript RegExp, supporting `/pattern/flags` syntax or plain patterns with automatic `gi` flags.
- **Match highlighting** -- all matches are highlighted on the page with a distinct color for the active match. Uses the CSS Custom Highlight API where supported, with a DOM-based fallback.
- **Match navigation** -- step through matches with previous/next buttons or Enter/Shift+Enter. A counter displays the current position (e.g. "3 / 17").
- **Highlight color picker** -- choose from 8 preset colors or pick a custom color. The selection persists across sessions.
- **Copy matches** -- copy matched content to the clipboard in three formats:
  - Copy HTML (outerHTML of matched elements)
  - Copy Inner HTML (innerHTML of matched elements)
  - Copy Texts (plain matched text, one per line)
- **Error handling** -- invalid regex patterns are caught and displayed inline without breaking the page.

## Installation

### Temporary (Development)

1. Open Zen Browser and navigate to `about:debugging`.
2. Select "This Firefox" from the sidebar.
3. Click "Load Temporary Add-on..." and select the `manifest.json` file from this project.

### Permanent

Package the extension as an `.xpi` file and install it through `about:addons`, or submit it to the Firefox Add-ons store.

## Usage

Press `Ctrl+Shift+F` to open the find bar. Alternatively, click the RegExe icon in the browser toolbar.

Type a search query to find and highlight matches on the page. Check the "Regex" checkbox to switch to regex mode. When regex mode is enabled, the input field accepts JavaScript regular expression syntax:

```
\d{4}          matches 4-digit numbers
(foo|bar)      matches "foo" or "bar"
/hello/i       matches "hello" case-insensitively
```

Press `Escape` to close the find bar and clear all highlights.

## Project Structure

```
RegExe/
├── manifest.json            Extension manifest (Manifest V2)
├── background/
│   └── background.js        Command and browser action handler
├── content/
│   ├── content.js           Find bar UI, search engine, highlighting
│   └── content.css          Styles for find bar and match highlights
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── LICENSE
└── README.md
```

## Requirements

- Zen Browser or Firefox 109+
- No additional dependencies

## License

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details.

Copyright (C) 2026 Ismail Kulak
