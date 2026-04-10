
import { CAPARepo } from "@/lib/adapters/database";

/**
 * Generate a unique CAPA ID in the format CAPA-YYYY-XXXX
 * Checks existing CAPAs to ensure uniqueness
 */
export async function generateUniqueCapaId(organizationId) {
  const year = new Date().getFullYear();
  
  // Fetch existing CAPAs to find the highest number for this year
  let existingCapas = [];
  try {
    existingCapas = await CAPARepo.filter({ organization_id: organizationId });
  } catch (error) {
    console.error("Could not fetch existing CAPAs:", error);
  }
  
  // Find the highest sequence number for this year
  let maxNumber = 0;
  existingCapas.forEach(capa => {
    if (capa.capa_id) {
      const match = capa.capa_id.match(/CAPA-(\d{4})-(\d+)/);
      if (match && parseInt(match[1]) === year) {
        const num = parseInt(match[2]);
        if (num > maxNumber) maxNumber = num;
      }
    }
  });
  
  // Generate the next number with leading zeros (4 digits)
  const nextNumber = String(maxNumber + 1).padStart(4, '0');
  return `CAPA-${year}-${nextNumber}`;
}

/**
 * Synchronous fallback for generating CAPA ID (uses random number)
 * Use generateUniqueCapaId when possible for proper sequencing
 */
export function generateCapaIdFallback() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `CAPA-${year}-${random}`;
}