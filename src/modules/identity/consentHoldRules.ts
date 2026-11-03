/**
 * C-01d on the transfer payment page (review round 2): while the consent waits, a product is not bought there, but an
 * EXISTING pending payment for it (its receipt to re-send or finish) is not a new purchase and stays open, like paying a
 * held booking. Display only: Company OS doesn't refuse either yet (tech-debt #74).
 */
export function consentHoldsPay({ held, what, pending }: { held: boolean; what: string; pending: boolean }): boolean {
  return held && what === 'product' && !pending;
}
