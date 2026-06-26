import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";

export const portalPollVotesTable = pgTable("portal_poll_votes", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  contentId: integer("content_id").notNull(),
  voterUserId: integer("voter_user_id").notNull(),
  optionIndex: integer("option_index").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqVote: unique("portal_poll_votes_content_voter_uniq").on(t.contentId, t.voterUserId),
}));

export type PortalPollVote = typeof portalPollVotesTable.$inferSelect;
