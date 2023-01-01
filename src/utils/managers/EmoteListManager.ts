import { randomBytes } from "crypto";
import { EmoteGQL } from "../../api/7tv/apiResponseType";
import { chunk } from "lodash";

class EmoteListManager {
  private static instance: EmoteListManager;
  static emotes: {
    id: string;
    pages: number;
    query: string;
    amount: number;
    emotes: EmoteGQL[][];
  }[] = [];

  private constructor() {}

  static getInstance() {
    if (EmoteListManager.instance) {
      return this.instance;
    }
    this.instance = new EmoteListManager();
    return this.instance;
  }

  static storeEmotes(query: string, emotes: EmoteGQL[]) {
    const emotesPerPage = 5;
    const identificator = randomBytes(8).toString("hex");
    const pages = Math.ceil(emotes.length / emotesPerPage);

    const chunkedEmotes = chunk(emotes, emotesPerPage);

    this.emotes.push({
      id: identificator,
      pages: pages,
      amount: emotes.length,
      query: query,
      emotes: chunkedEmotes,
    });

    const timeoutTime = 1000 * 60 * 10; //10 minutes
    setTimeout(() => {
      this.removeStoredEmote(identificator);
    }, timeoutTime);

    return identificator;
  }

  static removeStoredEmote(id: string) {
    this.emotes = this.emotes.filter((task) => task.id !== id);
  }

  static getStoredInfo(id: string) {
    const foundEntry = this.emotes.find((entries) => entries.id === id);
    if (!foundEntry) return undefined;
    const { amount, pages, query } = foundEntry;
    return {
      amount,
      pages,
      query,
    };
  }

  static getEmotesInPages(id: string, page: number) {
    const foundEntry = this.emotes.find((entries) => entries.id === id);
    if (!foundEntry) return;
    return foundEntry.emotes[--page];
  }
}

export { EmoteListManager };
