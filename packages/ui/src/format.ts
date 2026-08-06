// peso now lives in @wash-and-go/domain (platform-free, shared by web + mobile).
// Re-exported here so the mobile apps' existing `import { peso } from
// '@wash-and-go/ui'` keeps working.
export { peso } from '@wash-and-go/domain';
