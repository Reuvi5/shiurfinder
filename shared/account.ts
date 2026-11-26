// Types for account settings (FR-4): what GET /account sends, and what
// PATCH /account may change. Deleting is DELETE /account, with no body.

/** Which alerts the user wants (FR-15 reads these when it sends them). */
export interface AlertChoices {
  /** A shul or maggid shiur they follow posts a new shiur. */
  newShiur: boolean;
  /** A saved shiur's time or place changes. */
  changed: boolean;
  /** A saved shiur is cancelled. */
  cancelled: boolean;
  /** A reminder before a saved shiur starts. */
  reminders: boolean;
}

/** One topic they can pick. */
export interface TopicChoice {
  id: string;
  name: string;
}

/** GET /account response: the signed-in user's settings. */
export interface AccountSettings {
  name: string | null;
  /** Shown only. Changing it would need a new verification link. */
  email: string;
  darkMode: boolean;
  alerts: AlertChoices;
  /** Ids of the topics they picked (FR-14 uses them for recommendations). */
  topicIds: string[];
  /** Every topic they can pick from, in the list's order. */
  topicChoices: TopicChoice[];
}

/** PATCH /account body. Anything left out stays as it is. */
export interface AccountChanges {
  name?: string;
  darkMode?: boolean;
  alerts?: Partial<AlertChoices>;
  /** The whole new list: topics not in it are unpicked. */
  topicIds?: string[];
}
