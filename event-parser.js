class EventParser {
  constructor(data) {
    this.data = data;
  }

  parse() {
    return {
      event: this.getEventName(),
      chests: {
        gold: this.getChest("gold_chest"),
        platinum: this.getChest("platinum_chest"),
        draconic: this.getChest("dragfrag_chest_tier3"),
        freedom: this.getChest("freedom_chest")
      }
    };
  }

  getEventName() {
    return this.data?.event?.name || "Unknown Event";
  }

  getChest(chestKey) {
    return {
      key: chestKey,
      index: null,
      deck: [],
      found: false
    };
  }
}