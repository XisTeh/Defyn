import { describe, expect, it } from 'vitest';
import { findOrphanMediaIds } from './media';
describe('referências de mídia', () => {
  it('encontra blobs sem referência', () => expect(findOrphanMediaIds([{id:'used'},{id:'orphan'}],new Set(['used']))).toEqual(['orphan']));
  it('não remove mídia referenciada por outro registro', () => expect(findOrphanMediaIds([{id:'shared'}],new Set(['shared']))).toEqual([]));
  it('serializa metadados independentes do componente', () => expect(structuredClone({ id:'m', kind:'profile-avatar', width:512, height:512, sizeBytes:1000 })).toEqual({ id:'m', kind:'profile-avatar', width:512, height:512, sizeBytes:1000 }));
});
