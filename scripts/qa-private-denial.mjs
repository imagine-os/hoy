import assert from 'node:assert/strict';
/** Exact expected entry UI for an already-private route; never accepts either outcome indiscriminately. */
export async function expectPrivateDenial(page, persona, expectedCustomerReturn = null) {
  const visitor = persona === 'usr_public';
  await page.waitForURL(url => new URL(url.hash.slice(1), 'https://fictional.invalid').pathname === (visitor ? '/auth/sign-in' : '/no-access'));
  const route = new URL(new URL(page.url()).hash.slice(1), 'https://fictional.invalid');
  if (visitor) assert.deepEqual([...route.searchParams], expectedCustomerReturn ? [['next', expectedCustomerReturn]] : [], 'visitor gets only the explicit allowed customer return');
}
