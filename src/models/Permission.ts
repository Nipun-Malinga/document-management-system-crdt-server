export type PermissionLevel = 'UNAUTHORIZED' | 'READ_ONLY' | 'READ_WRITE' | 'ADMIN';

/** Subset of the backend's PermissionResponse that this server reads. */
export interface Permission {
  permission: PermissionLevel;
}
