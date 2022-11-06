import { randomBytes } from "crypto";
import { EmoteGQL } from "../../api/7tv/apiResponseType";

class EmoteListManager {
  private static instance: EmoteListManager;
  private emotesPerPage = 5;
  static emotes: {
    id: string;
    pages: number;
    query: string;
    emotes: EmoteGQL[];
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
    const identificator = randomBytes(8).toString("hex");
    const pages = Math.ceil(emotes.length / 5);
    this.emotes.push({
      id: identificator,
      pages: pages,
      query: query,
      emotes: emotes,
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
}

export { EmoteListManager };
