type SeedEnvironment = {
  APP_ENV?: string;
  DATABASE_URL?: string;
  NODE_ENV?: string;
  SEED_SYNTHETIC_DATA?: string;
};

export function assertSyntheticSeedAllowed(env: SeedEnvironment) {
  const appEnv =
    env.APP_ENV ??
    (env.NODE_ENV === "production" ? "production" : "development");

  if (!["development", "staging", "production"].includes(appEnv)) {
    throw new Error(
      `APP_ENV must be development, staging, or production; received "${appEnv}".`,
    );
  }
  if (appEnv === "production") {
    throw new Error(
      "Synthetic demo data must never be seeded into production.",
    );
  }
  if (env.NODE_ENV === "production" && appEnv !== "staging") {
    throw new Error(
      "A production runtime may seed synthetic data only when explicitly configured as staging.",
    );
  }
  if (appEnv === "staging") {
    if (env.SEED_SYNTHETIC_DATA !== "true") {
      throw new Error(
        "Staging seed requires APP_ENV=staging and SEED_SYNTHETIC_DATA=true.",
      );
    }
    let databaseName: string | undefined;
    if (env.DATABASE_URL) {
      try {
        const databaseUrl = new URL(env.DATABASE_URL);
        if (
          databaseUrl.protocol !== "postgres:" &&
          databaseUrl.protocol !== "postgresql:"
        ) {
          throw new Error();
        }
        databaseName = databaseUrl.pathname.split("/").filter(Boolean).at(-1);
      } catch {
        throw new Error(
          "Staging seed requires DATABASE_URL to be a valid PostgreSQL URL.",
        );
      }
    }
    if (!databaseName?.endsWith("_staging")) {
      throw new Error(
        "Synthetic staging seed requires a database name ending in _staging.",
      );
    }
  }
}
