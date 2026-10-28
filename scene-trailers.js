(function () {
  "use strict";

  const DEFAULT_FIELD = "scene_trailer_id";
  const STORAGE_KEY = "scene-trailers-mode";

  function log(...args) {
    console.log("%c[Scene Trailers]", "color: #0a0; font-weight: bold", ...args);
  }

  function getFieldName() {
    try {
      const settings = window.PluginApi && window.PluginApi.getPluginSettings && window.PluginApi.getPluginSettings("Scene Trailers");
      if (settings && settings.trailer_field) return settings.trailer_field;
    } catch (e) {}
    return DEFAULT_FIELD;
  }

  function getSceneIdFromPath() {
    const m = location.pathname.match(/\/scenes\/(\d+)/);
    return m ? m[1] : null;
  }

  function isScenePage() {
    return !!getSceneIdFromPath();
  }

  function extractTrailerId(scene, fieldName) {
    if (!scene) return null;
    const fields = scene.custom_fields;
    if (!fields) return null;

    if (Array.isArray(fields)) {
      const entry = fields.find(f => f.field === fieldName || f.name === fieldName || f.key === fieldName);
      if (entry && entry.value != null) return String(entry.value).trim();
    }

    if (typeof fields === "object" && fields[fieldName] != null) {
      return String(fields[fieldName]).trim();
    }

    return null;
  }

  function getVideoJsPlayer() {
    // Prefer the video.js player instance
    const videoEl = document.querySelector("video-js, .video-js");
    if (videoEl && videoEl.player) return videoEl.player;
    if (window.videojs) {
      const players = window.videojs.getPlayers ? window.videojs.getPlayers() : {};
      const ids = Object.keys(players);
      if (ids.length) return players[ids[0]];
    }
    // Fallback to raw video
    return document.querySelector("video");
  }

  function setPlayerSource(player, src) {
    if (!player || !src) return;
    log("Setting source to", src);

    // video.js player instance
    if (player.src && typeof player.src === "function") {
      try { player.pause(); } catch (e) {}
      player.src({ type: "video/mp4", src: src });
      player.load();
      const p = player.play();
      if (p && p.catch) p.catch(() => {});
      return;
    }

    // raw <video> element
    try { player.pause(); } catch (e) {}
    player.src = src;
    player.load();
    const p = player.play();
    if (p && p.catch) p.catch(() => {});
  }

  function createToggleButton(trailerId) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-secondary btn-sm scene-trailer-toggle";
    btn.style.cssText = "margin: 0 8px; padding: 2px 10px; font-size: 0.85em; vertical-align: middle;";
    btn.textContent = "View Trailer";
    btn.title = `Switch to trailer scene ${trailerId}`;
    btn.dataset.trailerId = trailerId;
    return btn;
  }

  function injectButton(trailerId) {
    if (document.querySelector(".scene-trailer-toggle")) return document.querySelector(".scene-trailer-toggle");

    const btn = createToggleButton(trailerId);

    const subheader = document.querySelector(".scene-subheader");
    if (subheader) {
      const dateEl = Array.from(subheader.children).find(el => el.textContent && /\d{4}/.test(el.textContent));
      if (dateEl && dateEl.nextSibling) {
        subheader.insertBefore(btn, dateEl.nextSibling);
      } else {
        subheader.appendChild(btn);
      }
      log("Injected button into .scene-subheader");
      return btn;
    }

    const created = document.querySelector("[class*='created'], .scene-date, .detail-item");
    if (created && created.parentNode) {
      created.parentNode.insertBefore(btn, created);
      log("Injected button near details");
      return btn;
    }

    const container = document.querySelector(".scene-tabs, .nav-tabs, .tab-content, .scene-details-container");
    if (container && container.parentNode) {
      container.parentNode.insertBefore(btn, container);
      log("Injected button as fallback");
      return btn;
    }

    btn.style.cssText = "position: fixed; top: 80px; right: 20px; z-index: 99999; background: #444; color: white; padding: 6px 12px;";
    document.body.appendChild(btn);
    log("Injected button as fixed fallback");
    return btn;
  }

  function wireToggle(btn, sceneId, trailerId) {
    let isTrailer = localStorage.getItem(STORAGE_KEY) === "trailer";

    function applyMode(trailerMode) {
      const player = getVideoJsPlayer();
      if (!player) {
        log("No video player found yet");
        return;
      }
      if (trailerMode) {
        setPlayerSource(player, `/scene/${trailerId}/stream`);
        btn.textContent = "View Scene";
        btn.title = "Switch back to main scene";
        log("Switched to trailer", trailerId);
      } else {
        setPlayerSource(player, `/scene/${sceneId}/stream`);
        btn.textContent = "View Trailer";
        btn.title = `Switch to trailer scene ${trailerId}`;
        log("Switched to scene", sceneId);
      }
      localStorage.setItem(STORAGE_KEY, trailerMode ? "trailer" : "scene");
      isTrailer = trailerMode;
    }

    btn.addEventListener("click", () => applyMode(!isTrailer));

    const check = setInterval(() => {
      if (getVideoJsPlayer()) {
        clearInterval(check);
        applyMode(isTrailer);
      }
    }, 400);
    setTimeout(() => clearInterval(check), 12000);
  }

  async function processPage() {
    if (!isScenePage()) return;
    const sceneId = getSceneIdFromPath();
    if (!sceneId) return;

    const fieldName = getFieldName();
    log("Processing scene", sceneId, "looking for field", fieldName);

    let trailerId = null;
    try {
      const res = await fetch("/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `query($id: ID!) { findScene(id: $id) { id custom_fields } }`,
          variables: { id: sceneId }
        })
      });
      const json = await res.json();
      if (json.errors) {
        log("GraphQL errors", json.errors);
        return;
      }
      const scene = json.data && json.data.findScene;
      trailerId = extractTrailerId(scene, fieldName);
      log("Extracted trailerId", trailerId, "from", scene && scene.custom_fields);
    } catch (e) {
      log("Fetch error", e);
      return;
    }

    if (!trailerId || !/^\d+$/.test(trailerId)) {
      log("No valid trailer Scene ID found in field", fieldName);
      return;
    }

    const tryInject = () => {
      const btn = injectButton(trailerId);
      if (btn && !btn.dataset.wired) {
        btn.dataset.wired = "1";
        wireToggle(btn, sceneId, trailerId);
        return true;
      }
      return !!btn;
    };

    if (!tryInject()) {
      const obs = new MutationObserver(() => {
        if (tryInject()) obs.disconnect();
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => obs.disconnect(), 10000);
    }
  }

  let lastPath = location.pathname;
  const pathObs = new MutationObserver(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      setTimeout(processPage, 250);
    }
  });
  pathObs.observe(document.body, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(processPage, 400));
  } else {
    setTimeout(processPage, 400);
  }

  log("Script loaded");
})();
