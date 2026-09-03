export type BadgeType =
  | "person-complete"
  | "filmography-milestone"
  | "watchlist-milestone"
  | "actor-milestone"
  | "director-milestone"
  | "decade-span";

export interface Badge {
  readonly id: string;
  readonly type: BadgeType;
  readonly label: string;
  readonly description: string;
  readonly earnedAt: string;
  readonly personId?: number;
  readonly personName?: string;
}
