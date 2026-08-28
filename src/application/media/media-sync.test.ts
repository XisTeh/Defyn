import { describe, expect, it } from 'vitest';
import { createMediaMetadataPayload, mediaStoragePath, parseMediaMetadataPayload, validateImageBlob } from './media-sync';
import type { LocalMedia } from '../../domain/media/media';

const accountId = '11111111-1111-4111-8111-111111111111';
const profileId = '22222222-2222-4222-8222-222222222222';
const mediaId = '33333333-3333-4333-8333-333333333333';
const timestamp = '2026-08-27T12:00:00.000Z';

function blob(type: string, bytes: number[]): Blob { return new Blob([Uint8Array.from(bytes)], { type }); }
function media(value: Blob): LocalMedia { return { id: mediaId, profileId, kind: 'profile-avatar', ownerType: 'profile', ownerId: profileId, mimeType: value.type, sizeBytes: value.size, width: 1, height: 1, blob: value, createdAt: timestamp, updatedAt: timestamp }; }

describe('contrato de media sync', () => {
  it('gera path determinístico sem nome original', () => expect(mediaStoragePath(accountId, profileId, mediaId, 'image/webp')).toBe(`${accountId}/${profileId}/${mediaId}.webp`));
  it('rejeita segmentos inseguros no path', () => expect(() => mediaStoragePath(accountId, '../profile', mediaId, 'image/png')).toThrow('Identificador'));
  it('aceita JPEG cuja assinatura corresponde ao MIME', async () => expect(validateImageBlob(blob('image/jpeg', [0xff, 0xd8, 0xff, 0x00]))).resolves.toBe('image/jpeg'));
  it('aceita PNG cuja assinatura corresponde ao MIME', async () => expect(validateImageBlob(blob('image/png', [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))).resolves.toBe('image/png'));
  it('aceita WebP cuja assinatura corresponde ao MIME', async () => expect(validateImageBlob(blob('image/webp', [82,73,70,70,0,0,0,0,87,69,66,80]))).resolves.toBe('image/webp'));
  it('rejeita SVG e MIME incompatível', async () => expect(validateImageBlob(blob('image/svg+xml', [60,115,118,103]))).rejects.toThrow('JPEG, PNG ou WebP'));
  it('não confia apenas no MIME declarado', async () => expect(validateImageBlob(blob('image/png', [60,115,118,103]))).rejects.toThrow('não corresponde'));
  it('serializa metadata sem Blob e valida o path no parse', () => {
    const value = media(blob('image/png', [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
    const payload = createMediaMetadataPayload(accountId, profileId, value);
    expect(payload).toMatchObject({ id: mediaId, profileId, mimeType: 'image/png', storagePath: `${accountId}/${profileId}/${mediaId}.png` });
    expect('blob' in payload).toBe(false);
    expect(parseMediaMetadataPayload(payload)).toEqual(payload);
  });
});
