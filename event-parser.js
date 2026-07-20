"use strict";

/**
 * Noir Chest Companion
 * Phase 1: War Dragons event deck parser
 *
 * Reads an about_v2 response and extracts:
 * - Event information
 * - Gold chest deck
 * - Platinum chest deck
 * - Draconic chest deck
 * - Freedom chest deck
 */

class EventParser {
  constructor(rawData) {
    this.rawData = rawData;
    this.data = this.normaliseData(rawData);
  }

  /**
   * Accepts either:
   * - A JavaScript object
   * - Raw JSON text
   */
  normaliseData(rawData) {
    if (!rawData) {
      throw new Error("No event data was provided.");
    }

    if (typeof rawData === "string") {
      try {
        return JSON.parse(rawData);
      } catch (error) {
        throw new Error("The imported event data is not valid JSON.");
      }
    }

    if (typeof rawData === "object") {
      return rawData;
    }

    throw new Error("Unsupported event data format.");
  }

  /**
   * Finds the gacha object even when the response
   * contains extra wrapper objects.
   */
  findGachaObject(value = this.data, visited = new WeakSet()) {
    if (!value || typeof value !== "object") {
      return null;
    }

    if (visited.has(value)) {
      return null;
    }

    visited.add(value);

    if (
      value.gacha &&
      typeof value.gacha === "object"
    ) {
      return value.gacha;
    }

    if (
      value.params &&
      value.params.deck_indices &&
      value.params.decks
    ) {
      return value;
    }

    for (const childValue of Object.values(value)) {
      const result = this.findGachaObject(childValue, visited);

      if (result) {
        return result;
      }
    }

    return null;
  }

  getGachaParams() {
    const gacha = this.findGachaObject();

    if (!gacha) {
      throw new Error(
        "No gacha data was found in this about_v2 response."
      );
    }

    const params = gacha.params || gacha;

    if (
      !params.deck_indices ||
      typeof params.deck_indices !== "object"
    ) {
      throw new Error("The event response does not contain deck_indices.");
    }

    if (
      !params.decks ||
      typeof params.decks !== "object"
    ) {
      throw new Error("The event response does not contain decks.");
    }

    return params;
  }

  /**
   * Searches common locations for the event name.
   * This is deliberately flexible because event
   * responses may use different wrappers.
   */
  getEventName() {
    const possibleNames = [
      this.data?.event?.name,
      this.data?.event_name,
      this.data?.name,
      this.data?.params?.name,
      this.data?.event?.display_name,
      this.data?.display_name
    ];

    const eventName = possibleNames.find(
      value => typeof value === "string" && value.trim()
    );

    return eventName?.trim() || "Unknown Event";
  }

  getChest(chestKey, label) {
    const params = this.getGachaParams();
    const deckIndices = params.deck_indices;
    const decks = params.decks;

    const rawIndex = deckIndices[chestKey];
    const rawDeck = decks[chestKey];

    const indexFound =
      rawIndex !== undefined &&
      rawIndex !== null &&
      rawIndex !== "";

    const deckFound = Array.isArray(rawDeck);

    const parsedIndex = Number(rawIndex);

    const indexIsValid =
      indexFound &&
      Number.isInteger(parsedIndex) &&
      parsedIndex >= 0;

    const warnings = [];

    if (!indexFound) {
      warnings.push(`No deck index found for ${label}.`);
    } else if (!indexIsValid) {
      warnings.push(`The ${label} deck index is invalid.`);
    }

    if (!deckFound) {
      warnings.push(`No deck found for ${label}.`);
    }

    if (
      deckFound &&
      indexIsValid &&
      rawDeck.length > 0 &&
      parsedIndex >= rawDeck.length
    ) {
      warnings.push(
        `${label} index ${parsedIndex} is outside the deck length of ${rawDeck.length}.`
      );
    }

    return {
      key: chestKey,
      label,
      found: deckFound && indexIsValid,
      index: indexIsValid ? parsedIndex : null,
      deck: deckFound ? [...rawDeck] : [],
      deckLength: deckFound ? rawDeck.length : 0,
      currentValue:
        deckFound &&
        indexIsValid &&
        parsedIndex < rawDeck.length
          ? rawDeck[parsedIndex]
          : null,
      warnings
    };
  }

  parse() {
    const params = this.getGachaParams();

    const result = {
      event: this.getEventName(),

      importedAt: new Date().toISOString(),

      chests: {
        gold: this.getChest(
          "gold_chest",
          "Gold"
        ),

        platinum: this.getChest(
          "platinum_chest",
          "Platinum"
        ),

        draconic: this.getChest(
          "dragfrag_chest_tier3",
          "Draconic"
        ),

        freedom: this.getChest(
          "freedom_chest",
          "Freedom"
        )
      },

      availableDeckKeys: Object.keys(params.decks),

      availableIndexKeys: Object.keys(params.deck_indices)
    };

    result.readyChestCount = Object.values(result.chests)
      .filter(chest => chest.found)
      .length;

    result.ready = result.readyChestCount > 0;

    return result;
  }

  /**
   * Quick helper for testing in the browser console.
   */
  static parse(rawData) {
    return new EventParser(rawData).parse();
  }
}
/**
 * Developer helper.
 * Tests an about_v2 response and prints the results.
 */
window.testEventParser = function(rawData) {

    try {

        const result = EventParser.parse(rawData);

        console.group("🐉 Noir Event Parser");

        console.log("Event:", result.event);
        console.log("Ready:", result.ready);

        Object.values(result.chests).forEach(chest => {

            console.group(chest.label);

            console.log("Found:", chest.found);
            console.log("Index:", chest.index);
            console.log("Deck Length:", chest.deckLength);
            console.log("Current Value:", chest.currentValue);

            if (chest.warnings.length) {
                console.warn(chest.warnings);
            }

            console.groupEnd();

        });

        console.groupEnd();

        return result;

    } catch (error) {

        console.error(error);

        return null;

    }

};

window.EventParser = EventParser;