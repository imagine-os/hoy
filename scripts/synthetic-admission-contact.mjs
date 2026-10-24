// Test setup only: create complete fictional identities BEFORE applying each scenario's faults.
// Never repairs existing rows, so missing/foreign/inactive/contact-negative cases stay meaningful.
export async function createSyntheticAdmissionCustomer(data, id, { name = `FICTIONAL ${id}`, email = `${id}@example.invalid`, phone = '+573000000099', locale = 'en', profileId = `${id}_profile` } = {}) {
  if (data.name !== 'mock' || !/^qa_[a-z0-9_]+$/i.test(id)) throw Error('synthetic_admission_identity_required');
  const tenantId = data.peek('tenants').find(row => row.id === 'ten_hoy')?.id;
  if (!tenantId || data.peek('users').some(row => row.id === id) || data.peek('profiles').some(row => row.user_id === id || row.id === profileId)) throw Error('synthetic_admission_duplicate');
  const user = await data.insert('users', { id, tenant_id: tenantId, email, phone, status: 'active', locale });
  await data.insert('profiles', { id: profileId, tenant_id: tenantId, user_id: id, full_name: name, initials: 'QA', photo_url: null, marketing_optin: false, whatsapp_verified: false });
  return user;
}

/** Test-only external-cache import, through the provider's real storage-event boundary.
 * Deliberately invalid legacy owner/tenant rows must NOT be created by guarded admission APIs.
 * Clone the fictional saved cache; never access/replace the provider's private runtime state.
 */
export function installSyntheticAdmissionCacheEvents(memory) {
  const listeners = new Set();
  globalThis.window = { addEventListener(type, listener) { if (type === 'storage') listeners.add(listener); } };
  return {
    clear() { listeners.clear(); },
    importFault(table, id, patch) {
      if (!['bookings', 'waitlist'].includes(table) || !id.startsWith('qa_') || Object.keys(patch).some(key => !['tenant_id', 'user_id'].includes(key))) throw Error('synthetic_import_fault_required');
      const stored = JSON.parse(memory.get('hoyos.db.v1'));
      const rows = stored.db[table].filter(row => row.id === id);
      if (rows.length !== 1) throw Error('synthetic_import_row_required');
      Object.assign(rows[0], patch);
      const newValue = JSON.stringify(stored);
      memory.set('hoyos.db.v1', newValue);
      for (const listener of listeners) listener({ key: 'hoyos.db.v1', newValue });
    },
  };
}
