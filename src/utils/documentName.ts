const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const DOCUMENT_NAME = new RegExp(`^documents/(${UUID})/branches/(${UUID})$`);

export interface DocumentRef {
  documentId: string;
  branchId: string;
}

/**
 * Parses a Hocuspocus room name of the form `documents/{documentId}/branches/{branchId}`.
 * Throws for anything else so client-supplied strings never reach backend URLs unchecked.
 */
export function parseDocumentName(name: string): DocumentRef {
  const match = DOCUMENT_NAME.exec(name);
  if (!match) {
    throw new Error(`Invalid document name: ${name}`);
  }
  return { documentId: match[1], branchId: match[2] };
}
