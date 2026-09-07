import { UnsafeUrlError } from "../scan-engine";
import type { ToolErrorCode, ToolIssue } from "./types";

export class ToolUserError extends Error {
  readonly code: ToolErrorCode;
  constructor(code: ToolErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const MESSAGES: Record<ToolErrorCode, string> = {
  invalid_url: "Enter a valid public http(s) URL.",
  unsafe_target: "That address is not a public website we can check.",
  unreachable: "The website hostname could not be reached.",
  timeout: "The check timed out before a response arrived.",
  too_large: "The response was larger than this checker allows.",
  rate_limited: "Too many checks. Please wait and try again.",
  failed: "Could not complete this check.",
};

export function toolIssue(code: ToolErrorCode, message = MESSAGES[code]): ToolIssue {
  return { code, message };
}

export function publicFetchIssue(error: unknown): ToolIssue {
  const raw = error instanceof Error ? error.message : "";
  if (/timed out/i.test(raw)) return toolIssue("timeout");
  if (/size limit/i.test(raw)) return toolIssue("too_large");
  if (/private|unsafe/i.test(raw)) return toolIssue("unsafe_target");
  if (/could not be resolved/i.test(raw)) return toolIssue("unreachable");
  if (/valid absolute|HTTP\/HTTPS/i.test(raw)) return toolIssue("invalid_url");
  return toolIssue("failed");
}

export function normalizeToolError(error: unknown): ToolUserError {
  if (error instanceof ToolUserError) return error;
  if (error instanceof UnsafeUrlError) {
    const issue = publicFetchIssue(error);
    return new ToolUserError(issue.code, issue.message);
  }
  const issue = publicFetchIssue(error);
  return new ToolUserError(issue.code, issue.message);
}
