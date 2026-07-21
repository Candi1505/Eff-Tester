/* ============================================================
   CHEST COMPANION BETA
   LIVE PREDICTOR ENGINE

   Uses imported War Dragons about_v2 event data.

   Features:
   - Reads Gold, Platinum, Draconic and Freedom decks
   - Remembers the selected chest
   - Records observed chest values
   - Solves the player's position in a live deck
   - Predicts upcoming raw deck values
   - Saves progress locally on the device
   ============================================================ */

(function initialiseLivePredictorEngine(window) {
  "use strict";

  const STORAGE_KEY =
    "chestCompanionLivePredictor";

  const SUPPORTED_CHESTS = [
    "gold",
    "platinum",
    "draconic",
    "freedom"
  ];

  const CHEST_LABELS = {
    gold: "Gold",
    platinum: "Platinum",
    draconic: "Draconic",
    freedom: "Freedom"
  };

  let state = loadState();

  /* ----------------------------------------------------------
     STATE
     ---------------------------------------------------------- */

  function createDefaultState() {
    return {
      activeChest: "gold",

      observations: {
        gold: [],
        platinum: [],
        draconic: [],
        freedom: []
      }
    };
  }

  function loadState() {
    const defaults =
      createDefaultState();

    try {
      const saved =
        JSON.parse(
          localStorage.getItem(
            STORAGE_KEY
          ) || "{}"
        );

      const activeChest =
        SUPPORTED_CHESTS.includes(
          saved.activeChest
        )
          ? saved.activeChest
          : "gold";

      const observations = {};

      SUPPORTED_CHESTS.forEach(
        chestType => {
          observations[chestType] =
            Array.isArray(
              saved.observations?.[
                chestType
              ]
            )
              ? saved.observations[
                  chestType
                ]
              : [];
        }
      );

      return {
        ...defaults,
        ...saved,
        activeChest,
        observations
      };
    } catch (error) {
      console.warn(
        "[Chest Companion] Could not restore live predictor state.",
        error
      );

      return defaults;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );
    } catch (error) {
      console.warn(
        "[Chest Companion] Could not save live predictor state.",
        error
      );
    }
  }

  /* ----------------------------------------------------------
     EVENT DATA
     ---------------------------------------------------------- */

  function getEventData() {
    const data =
      window.currentEventData;

    return (
      data &&
      typeof data === "object"
        ? data
        : null
    );
  }

  function isReady() {
    const eventData =
      getEventData();

    return Boolean(
      eventData?.ready &&
      eventData?.chests
    );
  }

  function getEventName() {
    const eventData =
      getEventData();

    const possibleName =
      eventData?.event?.name ||
      eventData?.event?.title ||
      eventData?.eventName ||
      eventData?.name ||
      eventData?.event;

    if (
      typeof possibleName ===
        "string" &&
      possibleName.trim()
    ) {
      return possibleName.trim();
    }

    const sourceFile =
      window.currentEventSourceFile;

    const sourceName =
      typeof sourceFile === "string"
        ? sourceFile
        : sourceFile?.name;

    if (
      typeof sourceName ===
        "string" &&
      sourceName.trim()
    ) {
      return sourceName
        .replace(
          /\.(txt|json)$/i,
          ""
        )
        .trim();
    }

    return "Unknown Event";
  }

  function getImportedAt() {
    const eventData =
      getEventData();

    return (
      eventData?.importedAt ||
      window.currentEventSourceFile
        ?.importedAt ||
      null
    );
  }

  /* ----------------------------------------------------------
     CHEST HELPERS
     ---------------------------------------------------------- */

  function isSupportedChest(
    chestType
  ) {
    return SUPPORTED_CHESTS.includes(
      String(chestType || "")
        .trim()
        .toLowerCase()
    );
  }

  function normaliseChestType(
    chestType
  ) {
    const value =
      String(
        chestType ||
        state.activeChest ||
        "gold"
      )
        .trim()
        .toLowerCase();

    return isSupportedChest(value)
      ? value
      : "gold";
  }

  function setActiveChest(
    chestType
  ) {
    const normalised =
      normaliseChestType(
        chestType
      );

    state.activeChest =
      normalised;

    saveState();

    window.dispatchEvent(
      new CustomEvent(
        "chest-companion-live-chest-changed",
        {
          detail: {
            chestType:
              normalised
          }
        }
      )
    );

    return normalised;
  }

  function getActiveChest() {
    return state.activeChest;
  }

  function getChestLabel(
    chestType =
      state.activeChest
  ) {
    const normalised =
      normaliseChestType(
        chestType
      );

    return (
      CHEST_LABELS[
        normalised
      ] ||
      normalised
    );
  }

  function getChestData(
    chestType =
      state.activeChest
  ) {
    const eventData =
      getEventData();

    if (!eventData?.chests) {
      return null;
    }

    return (
      eventData.chests[
        normaliseChestType(
          chestType
        )
      ] ||
      null
    );
  }

  function findDeckArray(
    chestData
  ) {
    if (Array.isArray(chestData)) {
      return chestData;
    }

    if (
      !chestData ||
      typeof chestData !==
        "object"
    ) {
      return [];
    }

    const possibleArrays = [
      chestData.deck,
      chestData.sequence,
      chestData.values,
      chestData.rewards,
      chestData.entries,
      chestData.data
    ];

    return (
      possibleArrays.find(
        Array.isArray
      ) ||
      []
    );
  }

  function getDeck(
    chestType =
      state.activeChest
  ) {
    return findDeckArray(
      getChestData(
        chestType
      )
    );
  }

  function getDeckLength(
    chestType =
      state.activeChest
  ) {
    const chestData =
      getChestData(
        chestType
      );

    const deck =
      getDeck(
        chestType
      );

    if (deck.length) {
      return deck.length;
    }

    const possibleLength =
      Number(
        chestData?.deckLength ??
        chestData?.length ??
        0
      );

    return Number.isFinite(
      possibleLength
    )
      ? possibleLength
      : 0;
  }

  function getFoundIndex(
    chestType =
      state.activeChest
  ) {
    const chestData =
      getChestData(
        chestType
      );

    if (!chestData) {
      return null;
    }

    const possibleIndex =
      chestData.foundIndex ??
      chestData.sourceIndex ??
      chestData.index ??
      null;

    const number =
      Number(possibleIndex);

    return Number.isFinite(number)
      ? number
      : null;
  }

  function hasChestDeck(
    chestType =
      state.activeChest
  ) {
    return (
      getDeckLength(
        chestType
      ) > 0
    );
  }

  /* ----------------------------------------------------------
     VALUE HELPERS
     ---------------------------------------------------------- */

  function serialiseValue(value) {
    if (value === undefined) {
      return "__undefined__";
    }

    if (typeof value === "string") {
      return `string:${value}`;
    }

    if (typeof value === "number") {
      return `number:${value}`;
    }

    if (typeof value === "boolean") {
      return `boolean:${value}`;
    }

    if (value === null) {
      return "null";
    }

    try {
      return (
        "json:" +
        JSON.stringify(value)
      );
    } catch (error) {
      return `text:${String(value)}`;
    }
  }

  function valuesMatch(
    first,
    second
  ) {
    return (
      serialiseValue(first) ===
      serialiseValue(second)
    );
  }

  function formatDeckValue(value) {
    if (value === undefined) {
      return "undefined";
    }

    if (value === null) {
      return "null";
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value);
    }

    try {
      return JSON.stringify(
        value
      );
    } catch (error) {
      return String(value);
    }
  }

  function getUniqueDeckValues(
    chestType =
      state.activeChest
  ) {
    const deck =
      getDeck(chestType);

    const unique =
      new Map();

    deck.forEach(value => {
      const key =
        serialiseValue(value);

      if (!unique.has(key)) {
        unique.set(key, value);
      }
    });

    return Array.from(
      unique.values()
    );
  }

  /* ----------------------------------------------------------
     OBSERVATION TRACKING
     ---------------------------------------------------------- */

  function getObservations(
    chestType =
      state.activeChest
  ) {
    const normalised =
      normaliseChestType(
        chestType
      );

    return [
      ...(state.observations[
        normalised
      ] || [])
    ];
  }

  function recordObservation(
    value,
    chestType =
      state.activeChest
  ) {
    const normalised =
      normaliseChestType(
        chestType
      );

    const observation = {
      number:
        (
          state.observations[
            normalised
          ]?.length || 0
        ) + 1,

      value,

      displayValue:
        formatDeckValue(
          value
        ),

      recordedAt:
        new Date()
          .toISOString()
    };

    state.observations[
      normalised
    ].push(
      observation
    );

    saveState();

    refresh();

    return observation;
  }

  function undoObservation(
    chestType =
      state.activeChest
  ) {
    const normalised =
      normaliseChestType(
        chestType
      );

    const removed =
      state.observations[
        normalised
      ].pop() || null;

    saveState();
    refresh();

    return removed;
  }

  function removeObservation(
    index,
    chestType =
      state.activeChest
  ) {
    const normalised =
      normaliseChestType(
        chestType
      );

    const observations =
      state.observations[
        normalised
      ];

    const numericIndex =
      Number(index);

    if (
      !Number.isInteger(
        numericIndex
      ) ||
      numericIndex < 0 ||
      numericIndex >=
        observations.length
    ) {
      return null;
    }

    const removed =
      observations.splice(
        numericIndex,
        1
      )[0];

    observations.forEach(
      (observation, position) => {
        observation.number =
          position + 1;
      }
    );

    saveState();
    refresh();

    return removed;
  }

  function resetObservations(
    chestType =
      state.activeChest
  ) {
    const normalised =
      normaliseChestType(
        chestType
      );

    state.observations[
      normalised
    ] = [];

    saveState();
    refresh();

    return true;
  }

  /* ----------------------------------------------------------
     POSITION SOLVER
     ---------------------------------------------------------- */

  function findCandidateStarts(
    chestType =
      state.activeChest
  ) {
    const deck =
      getDeck(chestType);

    const observations =
      getObservations(
        chestType
      );

    if (
      !deck.length ||
      !observations.length
    ) {
      return [];
    }

    const candidates = [];

    for (
      let start = 0;
      start < deck.length;
      start += 1
    ) {
      let matched = true;

      for (
        let offset = 0;
        offset <
          observations.length;
        offset += 1
      ) {
        const deckIndex =
          (
            start +
            offset
          ) %
          deck.length;

        if (
          !valuesMatch(
            deck[deckIndex],
            observations[
              offset
            ].value
          )
        ) {
          matched = false;
          break;
        }
      }

      if (matched) {
        candidates.push(start);
      }
    }

    return candidates;
  }

  function calculateConfidence(
    candidateCount,
    deckLength,
    observationCount
  ) {
    if (
      !candidateCount ||
      !deckLength ||
      !observationCount
    ) {
      return 0;
    }

    if (candidateCount === 1) {
      return 100;
    }

    const uniqueness =
      1 -
      (
        candidateCount /
        deckLength
      );

    const evidence =
      Math.min(
        observationCount / 6,
        1
      );

    return Math.max(
      1,
      Math.min(
        99,
        Math.round(
          uniqueness *
          evidence *
          100
        )
      )
    );
  }

  function solvePosition(
    chestType =
      state.activeChest
  ) {
    const normalised =
      normaliseChestType(
        chestType
      );

    const deck =
      getDeck(normalised);

    const observations =
      getObservations(
        normalised
      );

    if (!deck.length) {
      return {
        available: false,
        matched: false,
        solved: false,
        chestType:
          normalised,
        message:
          "The selected live deck is unavailable.",
        candidates: [],
        currentPositions: [],
        confidence: 0
      };
    }

    if (!observations.length) {
      return {
        available: true,
        matched: false,
        solved: false,
        chestType:
          normalised,
        message:
          "Record the first chest value to begin.",
        candidates: [],
        currentPositions: [],
        confidence: 0
      };
    }

    const candidateStarts =
      findCandidateStarts(
        normalised
      );

    if (!candidateStarts.length) {
      return {
        available: true,
        matched: false,
        solved: false,
        chestType:
          normalised,
        message:
          "The recorded values do not match this live deck.",
        candidates: [],
        currentPositions: [],
        confidence: 0
      };
    }

    const currentPositions =
      candidateStarts.map(
        start =>
          (
            start +
            observations.length -
            1
          ) %
          deck.length
      );

    const solved =
      candidateStarts.length === 1;

    return {
      available: true,
      matched: true,
      solved,

      chestType:
        normalised,

      observationCount:
        observations.length,

      candidateCount:
        candidateStarts.length,

      candidates:
        candidateStarts,

      currentPositions,

      currentIndex:
        solved
          ? currentPositions[0]
          : null,

      currentPosition:
        solved
          ? currentPositions[0] + 1
          : null,

      nextIndex:
        solved
          ? (
              currentPositions[0] +
              1
            ) %
            deck.length
          : null,

      confidence:
        calculateConfidence(
          candidateStarts.length,
          deck.length,
          observations.length
        ),

      message:
        solved
          ? (
              `Sequence located at position ` +
              `${currentPositions[0] + 1}.`
            )
          : (
              `${candidateStarts.length} possible ` +
              `positions remain.`
            )
    };
  }

  /* ----------------------------------------------------------
     UPCOMING VALUES
     ---------------------------------------------------------- */

  function predictUpcoming(
    count = 5,
    chestType =
      state.activeChest
  ) {
    const normalised =
      normaliseChestType(
        chestType
      );

    const deck =
      getDeck(normalised);

    const solution =
      solvePosition(
        normalised
      );

    if (
      !solution.solved ||
      !deck.length
    ) {
      return [];
    }

    const safeCount =
      Math.max(
        1,
        Math.min(
          Number(count) || 5,
          25
        )
      );

    const upcoming = [];

    for (
      let offset = 1;
      offset <= safeCount;
      offset += 1
    ) {
      const index =
        (
          solution.currentIndex +
          offset
        ) %
        deck.length;

      upcoming.push({
        number:
          offset,

        index,

        position:
          index + 1,

        value:
          deck[index],

        displayValue:
          formatDeckValue(
            deck[index]
          )
      });
    }

    return upcoming;
  }

  /* ----------------------------------------------------------
     STATUS
     ---------------------------------------------------------- */

  function getChestStatus(
    chestType
  ) {
    const normalised =
      normaliseChestType(
        chestType
      );

    const solution =
      solvePosition(
        normalised
      );

    return {
      chestType:
        normalised,

      label:
        getChestLabel(
          normalised
        ),

      loaded:
        hasChestDeck(
          normalised
        ),

      length:
        getDeckLength(
          normalised
        ),

      foundIndex:
        getFoundIndex(
          normalised
        ),

      observationCount:
        getObservations(
          normalised
        ).length,

      solved:
        solution.solved,

      playerPosition:
        solution.currentPosition,

      candidateCount:
        solution.candidateCount ||
        0,

      confidence:
        solution.confidence ||
        0
    };
  }

  function getStatus() {
    const eventData =
      getEventData();

    return {
      ready:
        isReady(),

      event:
        getEventName(),

      importedAt:
        getImportedAt(),

      sourceFile:
        window.currentEventSourceFile ||
        null,

      activeChest:
        getActiveChest(),

      activeChestLabel:
        getChestLabel(),

      readyChestCount:
        eventData?.readyChestCount ??
        SUPPORTED_CHESTS.filter(
          hasChestDeck
        ).length,

      chests:
        SUPPORTED_CHESTS.map(
          getChestStatus
        )
    };
  }

  function refresh() {
    const status =
      getStatus();

    window.dispatchEvent(
      new CustomEvent(
        "chest-companion-live-predictor-updated",
        {
          detail: status
        }
      )
    );

    return status;
  }

  window.addEventListener(
    "noir:event-imported",
    refresh
  );

  /* ----------------------------------------------------------
     PUBLIC API
     ---------------------------------------------------------- */

  window.LivePredictorEngine =
    Object.freeze({
      supportedChests:
        Object.freeze([
          ...SUPPORTED_CHESTS
        ]),

      isReady,
      refresh,

      getStatus,
      getEventData,
      getEventName,
      getImportedAt,

      isSupportedChest,
      setActiveChest,
      getActiveChest,
      getChestLabel,

      getChestData,
      getDeck,
      getDeckLength,
      getFoundIndex,
      getChestStatus,
      hasChestDeck,

      serialiseValue,
      valuesMatch,
      formatDeckValue,
      getUniqueDeckValues,

      getObservations,
      recordObservation,
      undoObservation,
      removeObservation,
      resetObservations,

      findCandidateStarts,
      solvePosition,
      predictUpcoming
    });

  console.info(
    "[Chest Companion] Live Predictor Engine with solver ready.",
    getStatus()
  );
})(window);