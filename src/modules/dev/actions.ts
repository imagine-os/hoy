import type { ActionDef } from '../../actions/types';
import { API_KEY_SCOPES } from './apiKeys';

/**
 * 0041 — D-07 developer keys (WebMCP). The raw key is never returned through the registry: a create or
 * rotate answers with the prefix and the key is shown once on screen, so it never lands in an agent transcript.
 */
export const devApiKeysCreate: ActionDef = {
  id: 'dev.apiKeys.create', label: { es: 'Crear una llave de API', en: 'Create an API key' },
  intent: { es: 'Crea una llave {environment} llamada {name} con {scopes}', en: 'Create a {environment} key called {name} with {scopes}' },
  params: { name: 'string', environment: 'enum:live,test', scopes: `csv of ${API_KEY_SCOPES.join(',')}`, expires_days: 'number (optional, default 90; 0 = never)' }, permission: 'api_keys.write',
};
export const devApiKeysRotate: ActionDef = {
  id: 'dev.apiKeys.rotate', label: { es: 'Rotar una llave', en: 'Rotate a key' },
  intent: { es: 'Rota la llave {id}; la vieja funciona 24 horas más', en: 'Rotate key {id}; the old one keeps working for 24 hours' },
  params: { id: 'string (api_keys.id or prefix)' }, permission: 'api_keys.write',
};
export const devApiKeysRevoke: ActionDef = {
  id: 'dev.apiKeys.revoke', label: { es: 'Revocar una llave', en: 'Revoke a key' },
  intent: { es: 'Revoca la llave {id} ya', en: 'Revoke key {id} now' },
  params: { id: 'string (api_keys.id or prefix)' }, permission: 'api_keys.write',
};
export const DEV_API_KEY_ACTIONS: ActionDef[] = [devApiKeysCreate, devApiKeysRotate, devApiKeysRevoke];
