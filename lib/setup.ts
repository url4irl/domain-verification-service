import dotenv from "dotenv";

dotenv.config();

export function setupEnvironment() {
  if (!process.env.SERVICE_HOST) {
    throw new Error("SERVICE_HOST environment variable is not set");
  }

  if (!process.env.TXT_RECORD_VERIFY_KEY) {
    throw new Error("TXT_RECORD_VERIFY_KEY environment variable is not set");
  }

  return {
    serviceHost: process.env.SERVICE_HOST,
    txtRecordVerifyKey: process.env.TXT_RECORD_VERIFY_KEY,
  };
}
