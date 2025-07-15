import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import { domainsTable, verificationLogsTable } from "../lib/db/schema";

export class TestDatabase {
  private db = drizzle(process.env.DATABASE_URL!);

  async setup() {
    try {
      // Run migrations to ensure test database has the latest schema
      await migrate(this.db, { migrationsFolder: "./lib/db/migrations" });
      console.log("Test database setup completed");
    } catch (error) {
      console.error("Failed to setup test database:", error);
      throw error;
    }
  }

  async cleanup() {
    try {
      // Clear all test data
      await this.db.delete(verificationLogsTable);
      await this.db.delete(domainsTable);

      // Reset auto-increment sequences
      await this.db.execute(sql`ALTER SEQUENCE domains_id_seq RESTART WITH 1`);
      await this.db.execute(
        sql`ALTER SEQUENCE verification_logs_id_seq RESTART WITH 1`
      );
    } catch (error) {
      console.error("Failed to cleanup test database:", error);
      throw error;
    }
  }

  async teardown() {
    try {
      // For Drizzle with node-postgres, we don't need to manually close connections
      // The database connection pool will be cleaned up automatically
      console.log("Test database teardown completed");
    } catch (error) {
      console.error("Failed to teardown test database:", error);
    }
  }

  getDb() {
    return this.db;
  }
}

export const testDb = new TestDatabase();
