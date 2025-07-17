import { z } from "zod";
import fetch, { RequestInit } from "node-fetch";

const BASE_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:4000"
    : "https://domain-verification.url4irl.com";

// Zod Schemas
export const DomainRegistrationSchema = z.object({
  domain: z.string().min(1, "Domain is required"),
  ip: z.string().ip({ version: "v4", message: "Invalid IP address" }),
  customerId: z.string().optional(),
});

export const GenerateVerificationTokenSchema = z.object({
  domain: z.string().min(1, "Domain is required"),
  customerId: z.string().min(1, "Customer ID is required"),
  serviceHost: z.string().min(1, "Service Host is required"),
  txtRecordVerifyKey: z.string().min(1, "TXT Record Verify Key is required"),
});

export const CheckDomainVerificationSchema = z.object({
  domain: z.string().min(1, "Domain is required"),
  customerId: z.string().min(1, "Customer ID is required"),
  serviceHost: z.string().min(1, "Service Host is required"),
  txtRecordVerifyKey: z.string().min(1, "TXT Record Verify Key is required"),
});

export const GetDomainStatusSchema = z.object({
  domain: z.string().min(1, "Domain is required"),
  customerId: z.string().min(1, "Customer ID is required"),
});

// Type definitions
export type DomainRegistrationInput = z.infer<typeof DomainRegistrationSchema>;
export type GenerateVerificationTokenInput = z.infer<
  typeof GenerateVerificationTokenSchema
>;
export type CheckDomainVerificationInput = z.infer<
  typeof CheckDomainVerificationSchema
>;
export type GetDomainStatusInput = z.infer<typeof GetDomainStatusSchema>;

export interface DomainRegistrationResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export interface GenerateVerificationTokenResponse {
  success: boolean;
  token?: string;
  txtRecord?: string;
  message?: string;
}

export interface CheckDomainVerificationResponse {
  success: boolean;
  verified?: boolean;
  message?: string;
}

export interface DomainStatusResponse {
  success: boolean;
  status?: string;
  verified?: boolean;
  message?: string;
}

export interface HealthCheckResponse {
  success: boolean;
  message?: string;
  timestamp?: string;
}

// API Client
export class DomainVerificationClient {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async _request<T>(
    method: string,
    path: string,
    data: any = null,
    queryParams: Record<string, string> | null = null
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (queryParams) {
      Object.keys(queryParams).forEach((key) =>
        url.searchParams.append(key, queryParams[key])
      );
    }

    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url.toString(), options);
    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.error || "Something went wrong");
    }
    return json as T;
  }

  async registerDomain(
    domainData: DomainRegistrationInput
  ): Promise<DomainRegistrationResponse> {
    const parsedData = DomainRegistrationSchema.parse(domainData);
    return this._request<DomainRegistrationResponse>(
      "POST",
      "/api/domains/push",
      parsedData
    );
  }

  async generateVerificationToken(
    tokenData: GenerateVerificationTokenInput
  ): Promise<GenerateVerificationTokenResponse> {
    const parsedData = GenerateVerificationTokenSchema.parse(tokenData);
    return this._request<GenerateVerificationTokenResponse>(
      "POST",
      "/api/domains/verify",
      parsedData
    );
  }

  async checkDomainVerification(
    checkData: CheckDomainVerificationInput
  ): Promise<CheckDomainVerificationResponse> {
    const parsedData = CheckDomainVerificationSchema.parse(checkData);
    return this._request<CheckDomainVerificationResponse>(
      "POST",
      "/api/domains/check",
      parsedData
    );
  }

  async getDomainStatus(
    statusData: GetDomainStatusInput
  ): Promise<DomainStatusResponse> {
    const parsedData = GetDomainStatusSchema.parse(statusData);
    return this._request<DomainStatusResponse>(
      "GET",
      "/api/domains/status",
      null,
      parsedData
    );
  }

  async healthCheck(): Promise<HealthCheckResponse> {
    return this._request<HealthCheckResponse>("GET", "/");
  }
}

export default DomainVerificationClient;
