/**
 * STORAGE ADAPTER — Supabase Storage implementation.
 *
 * Bucket strategy:
 *   "public-uploads"  — publicly accessible files (task photos, logos, SDS docs,
 *                        training materials, announcement photos, inspection photos,
 *                        diverter photos, task images, SSOP files, badge images)
 *   "private-uploads" — private files requiring signed URLs (future use)
 *
 * All file operations in the app go through this module.
 * No dependency remains.
 *
 * Setup required in Supabase Dashboard → Storage:
 *   1. Create bucket "public-uploads" (public = true)
 *   2. Create bucket "private-uploads" (public = false)
 *   3. Add RLS policy on public-uploads: allow insert for authenticated users
 *      CREATE POLICY "public_uploads_insert" ON storage.objects
 *        FOR INSERT WITH CHECK (bucket_id = 'public-uploads');
 *      CREATE POLICY "public_uploads_select" ON storage.objects
 *        FOR SELECT USING (bucket_id = 'public-uploads');
 *   4. For private-uploads, allow insert for authenticated and select via signed URLs
 *      CREATE POLICY "private_uploads_insert" ON storage.objects
 *        FOR INSERT WITH CHECK (bucket_id = 'private-uploads');
 */
import { supabase } from "@/api/supabaseClient";

const PUBLIC_BUCKET = "public-uploads";
const PRIVATE_BUCKET = "private-uploads";

/**
 * Generate a unique file path to avoid collisions.
 * Format: {orgId?}/{year}/{month}/{timestamp}-{random}-{filename}
 */
function generatePath(file) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const ts = now.getTime();
  const rand = Math.random().toString(36).slice(2, 8);
  // Sanitize filename: replace spaces and special chars
  const safeName = (file.name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${year}/${month}/${ts}-${rand}-${safeName}`;
}

/**
 * Upload a file (public).
 * @param {File|{file: File}} fileOrWrapper - Browser File object, or { file: File }
 * @returns {Promise<{file_url: string}>} The public URL of the uploaded file
 */
export async function uploadFile(fileOrWrapper) {
  // Accept both uploadFile(file) and uploadFile({ file })
  const file = fileOrWrapper instanceof File ? fileOrWrapper : fileOrWrapper?.file;
  if (!file) throw new Error("uploadFile: no file provided");

  const path = generatePath(file);

  const { error } = await supabase.storage
    .from(PUBLIC_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",      // 1 year cache
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (error) {
    if (error.message?.includes('Bucket not found') || error.message?.includes('bucket')) {
      throw new Error('Storage not configured yet — please create the "public-uploads" bucket in your Supabase dashboard under Storage.');
    }
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path);
  return { file_url: data.publicUrl };
}

/**
 * Upload a private file (requires signed URL to access).
 * @param {File} file - Browser File object
 * @returns {Promise<{file_uri: string}>} Private file URI (bucket path)
 */
export async function uploadPrivateFile(file) {
  const path = generatePath(file);

  const { error } = await supabase.storage
    .from(PRIVATE_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (error) throw new Error(`Private upload failed: ${error.message}`);

  // Return the path as the URI — used later to create signed URLs
  return { file_uri: `${PRIVATE_BUCKET}/${path}` };
}

/**
 * Create a time-limited signed URL for a private file.
 * @param {string} fileUri - URI returned by uploadPrivateFile (format: "private-uploads/path/to/file")
 * @param {number} [expiresIn=300] - Seconds until URL expires
 * @returns {Promise<{signed_url: string}>}
 */
export async function createSignedUrl(fileUri, expiresIn = 300) {
  // fileUri format: "private-uploads/2026/04/123-abc-file.pdf"
  // Strip bucket name prefix to get the path
  const prefix = `${PRIVATE_BUCKET}/`;
  const path = fileUri.startsWith(prefix) ? fileUri.slice(prefix.length) : fileUri;

  const { data, error } = await supabase.storage
    .from(PRIVATE_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) throw new Error(`Signed URL failed: ${error.message}`);
  return { signed_url: data.signedUrl };
}