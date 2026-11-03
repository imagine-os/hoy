/**
 * WEB-03 (Jas 1 Nov): the website schedule's class drawer. A visitor reads "sign in to book"; a signed-in person goes
 * straight to the app's booking (purchaseEntry), so the drawer says that instead. Copy keys only.
 */
export function drawerCopy(signedIn: boolean): { title: string; body: string } {
  return signedIn
    ? { title: 'site.schedule.bookTitle', body: 'site.schedule.bookBody' }
    : { title: 'site.schedule.loginTitle', body: 'site.schedule.loginBody' };
}
