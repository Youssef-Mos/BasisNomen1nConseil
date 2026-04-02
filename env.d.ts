declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;
    ADMIN_EMAIL: string;
    SMTP_HOST: string;
    SMTP_PORT: string;
    SMTP_USER: string;
    SMTP_PASS: string;
    SMTP_FROM: string;
    ADMIN_SESSION_SECRET: string;
    NODE_ENV: "development" | "production" | "test";
  }
}
