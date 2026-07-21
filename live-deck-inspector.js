/* ============================================================
   CHEST COMPANION BETA
   LIVE DECK INSPECTOR

   Displays raw entries from the currently selected live deck.

   Must load after:
   - live-predictor-engine.js
   - live-predictor-ui.js
   ============================================================ */

(function initialiseLiveDeckInspector(window) {
  "use strict";

  const Engine =
    window.LivePredictorEngine;

  if (!Engine) {
    console.error(
      "[Chest Companion] Live Predictor Engine was not found."
    );

    return;
  }

  const CARD_ID =
    "lpDeckInspectorCard";

  const LIST_ID =
    "lpDeckInspectorList";

  const INFO_ID =
    "lpDeckInspectorInfo";

  const PREVIOUS_ID =
    "lpDeckInspectorPrevious";

  const NEXT_ID =
    "lpDeckInspectorNext";

  const PAGE_SIZE = 10;

  let startIndex = 0;

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

  function formatRawValue(value) {
    if (value === null) {
      return "null";
    }

    if (value === undefined) {
      return "undefined";
    }

    if (typeof value === "string") {
      return value;
    }

    if (
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value);
    }

    try {
      return JSON.stringify(
        value,
        null,
        2
      );
    } catch (error) {
      return String(value);
    }
  }

  function getValueType(value) {
    if (value === null) {
      return "null";
    }

    if (Array.isArray(value)) {
      return "array";
    }

    return typeof value;
  }

  /* ----------------------------------------------------------
     STYLES
     ---------------------------------------------------------- */

  function addStyles() {
    if (
      document.getElementById(
        "lpDeckInspectorStyles"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "lpDeckInspectorStyles";

    style.textContent = `
      .lp-inspector-list {
        display: grid;
        gap: 9px;
        margin-top: 14px;
      }

      .lp-inspector-entry {
        display: grid;
        grid-template-columns:
          44px minmax(0, 1fr);

        gap: 10px;
        align-items: flex-start;

        padding: 12px;

        border: 1px solid #292929;
        border-radius: 14px;

        background:
          linear-gradient(
            145deg,
            #111111,
            #050505
          );
      }

      .lp-inspector-number {
        width: 38px;
        height: 38px;

        display: grid;
        place-items: center;

        border:
          1px solid rgba(
            185,
            149,
            66,
            0.34
          );

        border-radius: 50%;

        background:
          rgba(
            185,
            149,
            66,
            0.10
          );

        color: #d9bf76;

        font-size: 13px;
        font-weight: 900;
      }

      .lp-inspector-type {
        margin-bottom: 5px;

        color: #65e2b4;

        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .lp-inspector-value {
        margin: 0;

        overflow-wrap: anywhere;
        white-space: pre-wrap;

        color: #c4c4c4;

        font-family:
          ui-monospace,
          SFMono-Regular,
          Menlo,
          Monaco,
          Consolas,
          monospace;

        font-size: 12px;
        line-height: 1.45;
      }

      .lp-inspector-controls {
        display: grid;
        grid-template-columns:
          repeat(2, minmax(0, 1fr));

        gap: 9px;
        margin-top: 14px;
      }

      .lp-inspector-button {
        appearance: none;

        padding: 13px;

        border:
          1px solid rgba(
            185,
            149,
            66,
            0.34
          );

        border-radius: 14px;

        background:
          linear-gradient(
            145deg,
            #161616,
            #070707
          );

        color: #d9bf76;

        font: inherit;
        font-weight: 900;

        cursor: pointer;
      }

      .lp-inspector-button:disabled {
        border-color: #292929;

        color: #555555;

        cursor: default;
        opacity: 0.65;
      }

      .lp-inspector-summary {
        margin-top: 8px;

        color: #858585;

        font-size: 13px;
        line-height: 1.45;
      }
    `;

    document.head.appendChild(
      style
    );
  }

  /* ----------------------------------------------------------
     CARD CREATION
     ---------------------------------------------------------- */

  function createInspectorCard() {
    if (
      document.getElementById(
        CARD_ID
      )
    ) {
      return true;
    }

    const overlay =
      document.getElementById(
        "ccLivePredictorOverlay"
      );

    if (!overlay) {
      return false;
    }

    const selectedCard =
      document.getElementById(
        "lpSelectedHeading"
      )?.closest(
        ".lp-card"
      );

    if (!selectedCard) {
      return false;
    }

    const card =
      document.createElement(
        "section"
      );

    card.id = CARD_ID;
    card.className = "lp-card";

    card.innerHTML = `
      <h2>Raw deck inspector</h2>

      <p class="lp-muted">
        These are the exact values found inside
        the selected live chest deck.
      </p>

      <div
        id="${INFO_ID}"
        class="lp-inspector-summary"
      ></div>

      <div
        id="${LIST_ID}"
        class="lp-inspector-list"
      ></div>

      <div class="lp-inspector-controls">
        <button
          id="${PREVIOUS_ID}"
          class="lp-inspector-button"
          type="button"
        >
          Previous 10
        </button>

        <button
          id="${NEXT_ID}"
          class="lp-inspector-button"
          type="button"
        >
          Next 10
        </button>
      </div>
    `;

    selectedCard.parentNode.insertBefore(
      card,
      selectedCard
    );

    document
      .getElementById(
        PREVIOUS_ID
      )
      .addEventListener(
        "click",
        () => {
          startIndex = Math.max(
            0,
            startIndex - PAGE_SIZE
          );

          render();
        }
      );

    document
      .getElementById(
        NEXT_ID
      )
      .addEventListener(
        "click",
        () => {
          const deck =
            Engine.getDeck();

          if (
            startIndex +
              PAGE_SIZE <
            deck.length
          ) {
            startIndex +=
              PAGE_SIZE;
          }

          render();
        }
      );

    return true;
  }

  /* ----------------------------------------------------------
     RENDERING
     ---------------------------------------------------------- */

  function render() {
    if (
      !createInspectorCard()
    ) {
      return;
    }

    const chestType =
      Engine.getActiveChest();

    const chestLabel =
      Engine.getChestLabel(
        chestType
      );

    const deck =
      Engine.getDeck(
        chestType
      );

    const list =
      document.getElementById(
        LIST_ID
      );

    const info =
      document.getElementById(
        INFO_ID
      );

    const previousButton =
      document.getElementById(
        PREVIOUS_ID
      );

    const nextButton =
      document.getElementById(
        NEXT_ID
      );

    if (!Array.isArray(deck)) {
      info.textContent =
        `${chestLabel} does not contain a readable array.`;

      list.innerHTML = `
        <div class="lp-muted">
          No raw deck entries are available.
        </div>
      `;

      previousButton.disabled = true;
      nextButton.disabled = true;

      return;
    }

    if (!deck.length) {
      info.textContent =
        `${chestLabel} deck is empty.`;

      list.innerHTML = `
        <div class="lp-muted">
          No raw deck entries are available.
        </div>
      `;

      previousButton.disabled = true;
      nextButton.disabled = true;

      return;
    }

    if (startIndex >= deck.length) {
      startIndex = 0;
    }

    const entries =
      deck.slice(
        startIndex,
        startIndex + PAGE_SIZE
      );

    const firstDisplayed =
      startIndex + 1;

    const lastDisplayed =
      Math.min(
        startIndex +
          PAGE_SIZE,
        deck.length
      );

    info.textContent =
      `${chestLabel}: showing entries ` +
      `${firstDisplayed}–${lastDisplayed} ` +
      `of ${deck.length}.`;

    list.innerHTML =
      entries
        .map(
          (
            value,
            localIndex
          ) => {
            const absoluteIndex =
              startIndex +
              localIndex;

            return `
              <div class="lp-inspector-entry">
                <div class="lp-inspector-number">
                  ${absoluteIndex + 1}
                </div>

                <div>
                  <div class="lp-inspector-type">
                    ${escapeHTML(
                      getValueType(
                        value
                      )
                    )}
                  </div>

                  <pre class="lp-inspector-value">${escapeHTML(
                    formatRawValue(
                      value
                    )
                  )}</pre>
                </div>
              </div>
            `;
          }
        )
        .join("");

    previousButton.disabled =
      startIndex === 0;

    nextButton.disabled =
      startIndex +
        PAGE_SIZE >=
      deck.length;
  }

  function resetAndRender() {
    startIndex = 0;
    render();
  }

  /* ----------------------------------------------------------
     STARTUP
     ---------------------------------------------------------- */

  function initialise() {
    addStyles();

    createInspectorCard();

    window.addEventListener(
      "chest-companion-live-chest-changed",
      resetAndRender
    );

    window.addEventListener(
      "chest-companion-live-predictor-updated",
      render
    );

    window.addEventListener(
      "noir:event-imported",
      resetAndRender
    );

    /*
     * The live overlay is created dynamically.
     * This observer ensures the inspector is added
     * even if the UI loads slightly later.
     */
    const observer =
      new MutationObserver(
        () => {
          if (
            createInspectorCard()
          ) {
            render();
          }
        }
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );

    render();

    console.info(
      "[Chest Companion] Live Deck Inspector ready."
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

  window.LiveDeckInspector =
    Object.freeze({
      render,
      reset: resetAndRender
    });
})(window);