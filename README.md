# Cider 2 Plugin for WebNowPlaying
# Built using the Plugin Template (Cider + Vue 3 + TypeScript + Vite)

**(Requires Cider 2.5 or later)**

This is an attempt at enabling Cider to function with WebNowPlaying, so that Rainmeter player's can interact properly with Cider 2 as they did with the original (Or so i have heard,wasn't around then). It is a WIP and my first ever TS/VITE/VUE 3 project, if you have any tips or anything sticks out make sure you do a Pull or Issue.



## Available Commands
- `npm run dev` - Start development server, Cider can then listen to this server when you select "Enable Vite" from the main menu
- `npm run build` - Build the plugin to `dist/{plugin.config.ts:identifier}`


## How to install after build
- Copy `dist/{plugin.config.ts:identifier}` to the `/plugins` directory of your Cider app data directory
    - On Windows, this is `%APPDATA%\C2Windows\plugins`
    - On macOS, this is `~/Library/Application Support/sh.cider.electron/plugins`
    - On Linux, this is `~/.config/sh.cider.electron/plugins`

