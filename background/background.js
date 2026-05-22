/*
Copyright (C) 2026 İsmail Kulak

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

// RegExe — Background Script
// Relays toggle command to the active tab's content script

browser.commands.onCommand.addListener((command) => {
  if (command === "toggle-find-bar") {
    sendToggleToActiveTab();
  }
});

browser.browserAction.onClicked.addListener(() => {
  sendToggleToActiveTab();
});

function sendToggleToActiveTab() {
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    if (tabs[0]) {
      browser.tabs.sendMessage(tabs[0].id, { action: "toggle-find-bar" }).catch(() => {
        // Content script may not be loaded on restricted pages (about:*, addons, etc.)
      });
    }
  });
}
