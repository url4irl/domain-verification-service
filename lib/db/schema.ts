import {
  integer,
  pgTable,
  varchar,
  timestamp,
  boolean,
  text,
  unique,
} from "drizzle-orm/pg-core";

export const domainsTable = pgTable(
  "domains",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    ip: varchar({ length: 255 }).notNull(),
    customerId: varchar({ length: 255 }),
    isVerified: boolean().default(false).notNull(),
    verificationToken: varchar({ length: 64 }),
    tokenExpiresAt: timestamp(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp().defaultNow().notNull(),
  },
  (table) => ({
    // Ensure domain + customerId combination is unique
    uniqueDomainCustomer: unique().on(table.name, table.customerId),
  })
);

export const verificationLogsTable = pgTable("verification_logs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  domainId: integer()
    .references(() => domainsTable.id)
    .notNull(),
  customerId: varchar({ length: 255 }).notNull(),
  verificationStep: varchar({ length: 50 }).notNull(), // 'txt_record', 'cname_record', 'completed'
  status: varchar({ length: 20 }).notNull(), // 'pending', 'success', 'failed'
  details: text(),
  createdAt: timestamp().defaultNow().notNull(),
});
