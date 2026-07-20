/* ============================================================
   CHEST COMPANION BETA
   LIVE PREDICTOR UI

   Opens the new live-event predictor and prevents the legacy
   spreadsheet predictor from opening.

   Must load after:
   - event-parser.js
   - event-import.js
   - live-predictor-engine.js
   ============================================================ */

(function initialiseLivePredictorUI(window) {
  "use strict";

  const Engine =
    window.LivePredictorEngine;

  if (!Engine) {
    console.error(
      "[Chest Companion] live-predictor-engine.js did not load."
    );

    return;
  }

  const OVERLAY_ID =
    "ccLivePredictorOverlay";

  const STYLE_ID =
    "ccLivePredictorStyles";

  const CHEST_ICONS = {
    gold: "🥇",
    platinum: "💎",
    draconic: "🐉",
    freedom: "🦅"
  };

  /* ----------------------------------------------------------
     HELPERS
     ---------------------------------------------------------- */

  function escapeHTML(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      character =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        })[character]
    );
  }

  function formatNumber(value) {
    const number =
      Number(value);

    if (!Number.isFinite(number)) {
      return "—";
    }

    return number.toLocaleString();
  }

  function closeLegacyPredictor() {
    const legacyOverlay =
      document.getElementById(
        "ccPredictorOverlay"
      );

    if (legacyOverlay) {
      legacyOverlay.classList.remove(
        "cc-open"
      );
    }
  }

  /* ----------------------------------------------------------
     STYLES
     ---------------------------------------------------------- */

  function addStyles() {
    if (
      document.getElementById(
        STYLE_ID
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id = STYLE_ID;

    style.textContent = `
      #${OVERLAY_ID} {
        position: fixed;
        inset: 0;
        z-index: 1000000;

        display: none;
        overflow-y: auto;

        padding:
          max(14px, env(safe-area-inset-top))
          12px
          max(28px, env(safe-area-inset-bottom));

        background:
          radial-gradient(
            circle at 80% -10%,
            rgba(185, 149, 66, 0.10),
            transparent 38%
          ),
          #030303;

        color: #c2c2c2;

        font-family:
          Inter,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
      }

      #${OVERLAY_ID}.lp-open {
        display: block;
      }

      .lp-shell {
        width: min(100%, 760px);
        margin: 0 auto;
      }

      .lp-topbar {
        position: sticky;
        top: 0;
        z-index: 10;

        display: flex;
        align-items: center;
        justify-content: space-between;

        gap: 12px;
        padding: 10px 0 15px;

        border-bottom:
          1px solid rgba(185, 149, 66, 0.18);

        background:
          rgba(3, 3, 3, 0.96);

        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
      }

      .lp-eyebrow {
        margin: 0 0 5px;

        color: #b99542;

        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.22em;
      }

      .lp-topbar h1 {
        margin: 0;

        color: #d0d0d0;

        font-size: 25px;
      }

      .lp-subtitle {
        margin: 5px 0 0;

        color: #858585;

        font-size: 13px;
      }

      .lp-close {
        flex: 0 0 auto;

        width: 45px;
        height: 45px;

        border:
          1px solid #383838;
        border-radius: 50%;

        background:
          linear-gradient(
            180deg,
            #181818,
            #080808
          );

        color: #c5c5c5;

        font-size: 27px;
        cursor: pointer;
      }

      .lp-card {
        margin-top: 15px;
        padding: 18px;

        border:
          1px solid #292929;
        border-radius: 22px;

        background:
          linear-gradient(
            145deg,
            rgba(18, 18, 18, 0.99),
            rgba(4, 4, 4, 0.99)
          );

        box-shadow:
          0 20px 48px rgba(0, 0, 0, 0.55);
      }

      .lp-card h2 {
        margin: 0 0 8px;

        color: #c7c7c7;

        font-size: 20px;
      }

      .lp-muted {
        color: #858585;
        line-height: 1.5;
      }

      .lp-event-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;

        gap: 12px;
      }

      .lp-status {
        flex: 0 0 auto;

        padding: 9px 12px;

        border-radius: 999px;

        font-size: 13px;
        font-weight: 900;
      }

      .lp-status-ready {
        border:
          1px solid rgba(101, 226, 180, 0.38);

        background:
          rgba(101, 226, 180, 0.08);

        color: #65e2b4;
      }

      .lp-status-not-ready {
        border:
          1px solid rgba(216, 137, 137, 0.42);

        background:
          rgba(216, 137, 137, 0.08);

        color: #d88989;
      }

      .lp-event-name {
        margin: 4px 0;

        color: #dddddd;

        font-size: 26px;
        font-weight: 900;
      }

      .lp-source {
        margin-top: 8px;

        color: #777777;

        font-size: 12px;
      }

      .lp-chest-grid {
        display: grid;
        grid-template-columns:
          repeat(2, minmax(0, 1fr));

        gap: 10px;
        margin-top: 13px;
      }

      .lp-chest {
        appearance: none;

        display: block;
        width: 100%;

        padding: 15px;

        border:
          1px solid #303030;
        border-radius: 17px;

        background:
          linear-gradient(
            145deg,
            #151515,
            #070707
          );

        color: #bdbdbd;

        text-align: left;
        font: inherit;
        cursor: pointer;
      }

      .lp-chest.lp-active {
        border-color:
          rgba(217, 191, 118, 0.58);

        background:
          linear-gradient(
            145deg,
            rgba(185, 149, 66, 0.25),
            rgba(63, 46, 14, 0.19)
          );

        box-shadow:
          0 0 0 2px
          rgba(185, 149, 66, 0.08);
      }

      .lp-chest-top {
        display: flex;
        align-items: center;
        justify-content: space-between;

        gap: 8px;
      }

      .lp-chest-name {
        color: #d1d1d1;

        font-size: 16px;
        font-weight: 900;
      }

      .lp-chest-loaded {
        color: #65e2b4;
        font-size: 12px;
        font-weight: 900;
      }

      .lp-chest-missing {
        color: #d88989;
        font-size: 12px;
        font-weight: 900;
      }

      .lp-chest-stats {
        display: grid;
        grid-template-columns:
          repeat(2, minmax(0, 1fr));

        gap: 8px;
        margin-top: 13px;
      }

      .lp-mini-stat {
        padding: 10px;

        border:
          1px solid #282828;
        border-radius: 12px;

        background: #090909;
      }

      .lp-mini-stat span,
      .lp-mini-stat strong {
        display: block;
      }

      .lp-mini-stat span {
        color: #777777;

        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .lp-mini-stat strong {
        margin-top: 4px;

        color: #c8c8c8;

        font-size: 15px;
      }

      .lp-selected-grid {
        display: grid;
        grid-template-columns:
          repeat(2, minmax(0, 1fr));

        gap: 9px;
        margin-top: 12px;
      }

      .lp-selected-stat {
        padding: 13px;

        border:
          1px solid #292929;
        border-radius: 14px;

        background:
          linear-gradient(
            145deg,
            #111111,
            #060606
          );
      }

      .lp-selected-stat span,
      .lp-selected-stat strong {
        display: block;
      }

      .lp-selected-stat span {
        color: #7c7c7c;
        font-size: 11px;
      }

      .lp-selected-stat strong {
        margin-top: 5px;

        color: #d9bf76;
        font-size: 18px;
      }

      .lp-message {
        margin-top: 14px;
        padding: 13px;

        border:
          1px solid rgba(185, 149, 66, 0.22);
        border-radius: 14px;

        background:
          rgba(185, 149, 66, 0.06);

        color: #a9a9a9;

        line-height: 1.5;
      }

      .lp-refresh {
        width: 100%;

        margin-top: 14px;
        padding: 14px;

        border:
          1px solid rgba(185, 149, 66, 0.42);
        border-radius: 15px;

        background:
          linear-gradient(
            180deg,
            #d9bf76,
            #b99542
          );

        color: #070707;

        font: inherit;
        font-weight: 900;
        cursor: pointer;
      }

      @media (max-width: 520px) {
        .lp-card {
          padding: 15px;
          border-radius: 19px;
        }

        .lp-chest-grid {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(
      style
    );
  }

  /* ----------------------------------------------------------
     UI CREATION
     ---------------------------------------------------------- */

  function createOverlay() {
    if (
      document.getElementById(
        OVERLAY_ID
      )
    ) {
      return;
    }

    const overlay =
      document.createElement("div");

    overlay.id = OVERLAY_ID;

    overlay.innerHTML = `
      <div class="lp-shell">
        <header class="lp-topbar">
          <div>
            <p class="lp-eyebrow">
              CHEST COMPANION
            </p>

            <h1>
              Live Chest Predictor
            </h1>

            <p
              id="lpSubtitle"
              class="lp-subtitle"
            >
              Waiting for event data
            </p>
          </div>

          <button
            id="lpClose"
            class="lp-close"
            type="button"
            aria-label="Close live predictor"
          >
            ×
          </button>
        </header>

        <section class="lp-card">
          <div class="lp-event-header">
            <div>
              <p class="lp-eyebrow">
                IMPORTED EVENT
              </p>

              <div
                id="lpEventName"
                class="lp-event-name"
              >
                No Event
              </div>

              <div
                id="lpEventDetails"
                class="lp-muted"
              ></div>
            </div>

            <div
              id="lpStatus"
              class="lp-status lp-status-not-ready"
            >
              Not ready
            </div>
          </div>

          <div
            id="lpSource"
            class="lp-source"
          ></div>
        </section>

        <section class="lp-card">
          <h2>Choose chest</h2>

          <p class="lp-muted">
            Select the live deck you want to inspect.
          </p>

          <div
            id="lpChestGrid"
            class="lp-chest-grid"
          ></div>
        </section>

        <section class="lp-card">
          <h2 id="lpSelectedHeading">
            Selected chest
          </h2>

          <div
            id="lpSelectedGrid"
            class="lp-selected-grid"
          ></div>

          <div
            id="lpSelectedMessage"
            class="lp-message"
          ></div>

          <button
            id="lpRefresh"
            class="lp-refresh"
            type="button"
          >
            Refresh live data
          </button>
        </section>
      </div>
    `;

    document.body.appendChild(
      overlay
    );
  }

  /* ----------------------------------------------------------
     RENDERING
     ---------------------------------------------------------- */

  function renderChestCards(
    status
  ) {
    const container =
      document.getElementById(
        "lpChestGrid"
      );

    container.innerHTML =
      status.chests
        .map(chest => {
          const icon =
            CHEST_ICONS[
              chest.chestType
            ] || "✦";

          return `
            <button
              type="button"
              class="lp-chest ${
                status.activeChest ===
                chest.chestType
                  ? "lp-active"
                  : ""
              }"
              data-lp-chest="${
                chest.chestType
              }"
            >
              <div class="lp-chest-top">
                <span class="lp-chest-name">
                  ${icon}
                  ${escapeHTML(
                    chest.label
                  )}
                </span>

                <span class="${
                  chest.loaded
                    ? "lp-chest-loaded"
                    : "lp-chest-missing"
                }">
                  ${
                    chest.loaded
                      ? "Ready"
                      : "Missing"
                  }
                </span>
              </div>

              <div class="lp-chest-stats">
                <div class="lp-mini-stat">
                  <span>Deck length</span>

                  <strong>
                    ${formatNumber(
                      chest.length
                    )}
                  </strong>
                </div>

                <div class="lp-mini-stat">
                  <span>Found index</span>

                  <strong>
                    ${formatNumber(
                      chest.foundIndex
                    )}
                  </strong>
                </div>
              </div>
            </button>
          `;
        })
        .join("");

    container
      .querySelectorAll(
        "[data-lp-chest]"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            Engine.setActiveChest(
              button.dataset.lpChest
            );

            render();
          }
        );
      });
  }

  function renderSelectedChest(
    status
  ) {
    const selected =
      status.chests.find(
        chest =>
          chest.chestType ===
          status.activeChest
      );

    const heading =
      document.getElementById(
        "lpSelectedHeading"
      );

    const grid =
      document.getElementById(
        "lpSelectedGrid"
      );

    const message =
      document.getElementById(
        "lpSelectedMessage"
      );

    if (!selected) {
      heading.textContent =
        "Selected chest";

      grid.innerHTML = "";

      message.textContent =
        "No chest data is available.";

      return;
    }

    heading.textContent =
      `${
        CHEST_ICONS[
          selected.chestType
        ] || "✦"
      } ${selected.label} Chest`;

    grid.innerHTML = `
      <div class="lp-selected-stat">
        <span>Deck loaded</span>

        <strong>
          ${
            selected.loaded
              ? "Yes"
              : "No"
          }
        </strong>
      </div>

      <div class="lp-selected-stat">
        <span>Deck length</span>

        <strong>
          ${formatNumber(
            selected.length
          )}
        </strong>
      </div>

      <div class="lp-selected-stat">
        <span>Found index</span>

        <strong>
          ${formatNumber(
            selected.foundIndex
          )}
        </strong>
      </div>

      <div class="lp-selected-stat">
        <span>Player position</span>

        <strong>
          Not solved
        </strong>
      </div>
    `;

    message.textContent =
      selected.loaded
        ? (
            `${selected.label} live deck data is connected. ` +
            "The next step is adding the chest drop recorder " +
            "and position solver."
          )
        : (
            `${selected.label} deck data was not found in ` +
            "the imported event file."
          );
  }

  function render() {
    const status =
      Engine.getStatus();

    document.getElementById(
      "lpEventName"
    ).textContent =
      status.event;

    document.getElementById(
      "lpSubtitle"
    ).textContent =
      status.ready
        ? `${status.readyChestCount} live deck(s) connected`
        : "Import an about_v2 file to begin";

    document.getElementById(
      "lpEventDetails"
    ).textContent =
      status.ready
        ? `${status.readyChestCount} chest deck(s) ready`
        : "No live event data is currently available.";

    const statusBadge =
      document.getElementById(
        "lpStatus"
      );

    statusBadge.textContent =
      status.ready
        ? "Live data ready"
        : "Not ready";

    statusBadge.className =
      status.ready
        ? "lp-status lp-status-ready"
        : "lp-status lp-status-not-ready";

    document.getElementById(
      "lpSource"
    ).textContent =
      status.sourceFile
        ? `Source: ${status.sourceFile}`
        : "";

    renderChestCards(status);
    renderSelectedChest(status);
  }

  /* ----------------------------------------------------------
     OPEN AND CLOSE
     ---------------------------------------------------------- */

  function open(
    chestType = null
  ) {
    closeLegacyPredictor();

    if (
      chestType &&
      Engine.isSupportedChest(
        chestType
      )
    ) {
      Engine.setActiveChest(
        chestType
      );
    }

    render();

    document
      .getElementById(
        OVERLAY_ID
      )
      .classList.add(
        "lp-open"
      );

    document.body.style.overflow =
      "hidden";
  }

  function close() {
    document
      .getElementById(
        OVERLAY_ID
      )
      .classList.remove(
        "lp-open"
      );

    document.body.style.overflow =
      "";
  }

  /* ----------------------------------------------------------
     LEGACY BUTTON TAKEOVER
     ---------------------------------------------------------- */

  function detectChestType(
    element
  ) {
    const text = [
      element?.dataset?.chest,
      element?.dataset?.chestType,
      element?.dataset?.predictor,
      element?.id,
      element?.className,
      element?.textContent,
      element?.getAttribute?.(
        "aria-label"
      ),
      element?.getAttribute?.(
        "title"
      )
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (
      text.includes("draconic") ||
      text.includes("drac")
    ) {
      return "draconic";
    }

    if (
      text.includes("freedom")
    ) {
      return "freedom";
    }

    if (
      text.includes("platinum")
    ) {
      return "platinum";
    }

    if (
      text.includes("gold")
    ) {
      return "gold";
    }

    return null;
  }

  function interceptPredictorButtons(
    event
  ) {
    const target =
      event.target.closest(
        [
          "#ccPredictorLauncher",
          "[data-predictor]",
          "[data-chest]",
          "[id*='predictor' i]",
          "[class*='predictor' i]"
        ].join(",")
      );

    if (!target) {
      return;
    }

    if (
      target.closest(
        `#${OVERLAY_ID}`
      )
    ) {
      return;
    }

    if (
      target.closest(
        "#predictorView"
      ) &&
      target.id !==
        "ccPredictorLauncher"
    ) {
      /*
       * Leave the event-import and workbook-management
       * controls alone.
       */
      const description = [
        target.id,
        target.textContent,
        target.className
      ]
        .join(" ")
        .toLowerCase();

      const launchesPredictor =
        description.includes(
          "engine ready"
        ) ||
        description.includes(
          "open predictor"
        ) ||
        description.trim() ===
          "predictor";

      if (!launchesPredictor) {
        return;
      }
    }

    const description = [
      target.id,
      target.textContent,
      target.className
    ]
      .join(" ")
      .toLowerCase();

    const looksLikeLauncher =
      target.id ===
        "ccPredictorLauncher" ||
      description.includes(
        "engine ready"
      ) ||
      description.includes(
        "open predictor"
      ) ||
      description.trim() ===
        "predictor";

    if (!looksLikeLauncher) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    open(
      detectChestType(
        target
      )
    );
  }

  /* ----------------------------------------------------------
     EVENTS
     ---------------------------------------------------------- */

  function attachEvents() {
    document
      .getElementById(
        "lpClose"
      )
      .addEventListener(
        "click",
        close
      );

    document
      .getElementById(
        "lpRefresh"
      )
      .addEventListener(
        "click",
        () => {
          Engine.refresh();
          render();
        }
      );

    document
      .getElementById(
        OVERLAY_ID
      )
      .addEventListener(
        "click",
        event => {
          if (
            event.target.id ===
            OVERLAY_ID
          ) {
            close();
          }
        }
      );

    document.addEventListener(
      "click",
      interceptPredictorButtons,
      true
    );

    document.addEventListener(
      "keydown",
      event => {
        if (
          event.key === "Escape"
        ) {
          close();
        }
      }
    );

    window.addEventListener(
      "noir:event-imported",
      () => {
        Engine.refresh();

        const overlay =
          document.getElementById(
            OVERLAY_ID
          );

        if (
          overlay?.classList.contains(
            "lp-open"
          )
        ) {
          render();
        }
      }
    );

    window.addEventListener(
      "chest-companion-live-predictor-updated",
      () => {
        const overlay =
          document.getElementById(
            OVERLAY_ID
          );

        if (
          overlay?.classList.contains(
            "lp-open"
          )
        ) {
          render();
        }
      }
    );
  }

  /* ----------------------------------------------------------
     STARTUP
     ---------------------------------------------------------- */

  function initialise() {
    addStyles();
    createOverlay();
    attachEvents();

    console.info(
      "[Chest Companion] Live Predictor UI ready.",
      Engine.getStatus()
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initialise
    );
  } else {
    initialise();
  }

  window.LivePredictorUI =
    Object.freeze({
      open,
      close,
      render
    });
})(window);