# Scene Trailers

Adds a **View Trailer / View Scene** toggle button to individual scene pages in [Stash](https://github.com/stashapp/stash).

When a scene has a trailer stored as another local scene, the button lets you switch the video player between the full scene and the trailer without leaving the page.

## Features

- In-place player source switching (no page navigation)
- Uses a simple custom field containing the trailer’s Scene ID
- Remembers the last mode (Trailer or Scene) across refreshes
- Works with Stash’s video.js player
- Lightweight pure-UI plugin

## Installation

1. Create a folder for the plugin, e.g. `scene-trailers` inside your Stash plugins directory.
2. Place these two files in that folder:
   - `scene-trailers.yml`
   - `scene-trailers.js`
3. In Stash go to **Settings → Plugins** and click **Reload Plugins**.
4. The plugin should appear in the list. Enable it if needed and reload the page.

## Usage

1. On the scene that should have a trailer, add a custom field:
   - **Name**: `scene_trailer_id` (or whatever name you set in the plugin settings)
   - **Value**: the numeric Scene ID of the trailer scene (e.g. `8150`)
2. Open the scene page. A **View Trailer** button appears in the scene subheader (or as a fallback button).
3. Click it to switch the player to the trailer scene. Click again to return to the main scene.

The trailer scene itself does not need to be a member of any group or have special tags — only the Scene ID in the custom field is required.

## Plugin Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Trailer field name | Name of the custom field that stores the trailer Scene ID | `scene_trailer_id` |

## Requirements

- Stash with custom field support for scenes
- Modern browser with the video.js player used by Stash

## How It Works

The plugin reads the configured custom field via GraphQL. If it contains a valid numeric Scene ID, it injects a toggle button. Clicking the button calls the video.js player API to switch between:

- `/scene/<current-id>/stream`
- `/scene/<trailer-id>/stream`

State is stored in `localStorage` so the preferred mode persists.

## Files

- `scene-trailers.yml` — plugin metadata and settings
- `scene-trailers.js` — UI injection and player control

## License

MIT
