export interface BTTVEmote {
  id: string;
  code: string;
  animated: boolean;
  user?: {
    displayName: string;
  };
}

export type BTTVResponseById = BTTVEmote;

export type BTTVResponseByQuery = BTTVEmote[];
