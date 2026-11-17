# Team screen: a Teacher login is always linked to a teacher record

Prompt intent: Hoy teachers saw "Tu cuenta no está vinculada a un perfil de profesor" because the Team screen invited them without a `personId`, so Company OS never linked the login to the teacher's person.
Decision: a Teacher invite now requires a teacher profile (a required select of profiles without a login) and sends its `personId`; re-sending keeps it; each Teacher row without a profile shows "Sin perfil de profesor" with a select and "Vincular", which re-invites with `personId` (Company OS commits the link before `already_signed_up`, so nothing is emailed). Refusals (`person_email_mismatch`, `user_linked_to_other_person`, `person_linked_to_other_user`, `person_not_found`, `teacher_required`) read in Spanish and English. No Company OS change; `company-os.json` unchanged. No new component or state: Select, Badge (warn tone), Button and Field are reused, so the component library is unchanged.
Alternative rejected: linking from the teacher's own side or by matching email silently; changing an existing link from this screen (out of scope).
Files: src/modules/admin/team/{teamApi.ts,TeamUsersPanel.tsx,strings.ts}, src/modules/staff/desk/strings.ts, scripts/test-auth-identity.mjs
Version: pending (next frontend release).
