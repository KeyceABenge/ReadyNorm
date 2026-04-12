/**
 * INTEGRATIONS ADAPTER — Routes all AI/LLM/email/image operations through
 * backend functions (OpenAI + SendGrid). No dependency.
 *
 * Backend functions used:
 *   invokeLLM     — OpenAI GPT-4o-mini / GPT-4o
 *   sendEmail     — SendGrid
 *   generateImage — OpenAI DALL-E 3
 *   extractData   — OpenAI GPT-4o (vision + document)
 *
 * All method signatures are preserved for backward compatibility.
 */
import { invokeFunction } from "./functions";

/**
 * Call an LLM with a prompt and optional structured output.
 * @param {object} params
 * @param {string} params.prompt
 * @param {boolean} [params.add_context_from_internet] - Not supported (ignored)
 * @param {object} [params.response_json_schema]
 * @param {string[]} [params.file_urls]
 * @param {string} [params.model]
 * @returns {Promise<string|object>}
 */
export async function invokeLLM(params) {
  const response = await invokeFunction('invokeLLM', {
    prompt: params.prompt,
    response_json_schema: params.response_json_schema || null,
    file_urls: params.file_urls || null,
    model: params.model || null,
  });

  // Check for error responses so callers' catch blocks fire
  if (response.status >= 400 || response.data?.error) {
    throw new Error(response.data?.error || `invokeLLM failed with status ${response.status}`);
  }

  const data = response.data;

  // If schema was provided, the backend returns the parsed JSON directly
  if (params.response_json_schema) {
    return data;
  }
  // Plain text response
  return data.result || data;
}

/**
 * Generate an image from a text prompt.
 * @param {object} params
 * @param {string} params.prompt
 * @param {string[]} [params.existing_image_urls] - Not used by DALL-E 3 (ignored)
 * @returns {Promise<{url: string}>}
 */
export async function generateImage(params) {
  const response = await invokeFunction('generateImage', {
    prompt: params.prompt,
  });
  return response.data; // { url: "..." }
}

/**
 * Send an email via SendGrid.
 * @param {object} params
 * @param {string} params.to
 * @param {string} params.subject
 * @param {string} params.body
 * @param {string} [params.from_name]
 */
export async function sendEmail(params) {
  const response = await invokeFunction('sendEmail', {
    to: params.to,
    subject: params.subject,
    body: params.body,
    from_name: params.from_name || null,
  });
  return response.data;
}

/**
 * Extract structured data from an uploaded file using GPT-4o vision.
 * @param {object} params
 * @param {string} params.file_url
 * @param {object} params.json_schema
 * @returns {Promise<{status: string, output: object}>}
 */
export async function extractDataFromFile(params) {
  const response = await invokeFunction('extractData', {
    file_url: params.file_url,
    json_schema: params.json_schema,
  });
  return response.data; // { status, details, output }
}