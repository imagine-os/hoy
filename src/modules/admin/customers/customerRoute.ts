export interface CustomerSelf { userId: string; personId: string }
export interface CustomerRouteIds { displayId: string; personId: string }
export interface CustomerIdentityProvider { self?: () => Promise<CustomerSelf | null> }
/** Only the provider's explicit current-login alias may be translated. Never infer identity from name/contact. */
export function customerRouteIds(routeId: string, self: CustomerSelf | null): CustomerRouteIds {
  if (self && (routeId === self.userId || routeId === self.personId)) return {displayId:self.userId,personId:self.personId};
  return {displayId:routeId,personId:routeId};
}
/** One mounted reader; a provider/session/permission change cancels every older answer. */
export function createCustomerRouteReader() {
  let generation = 0;
  return {
    cancel: () => { generation++; },
    read: async (provider: CustomerIdentityProvider, routeId: string, actorId: string): Promise<CustomerRouteIds | null> => {
      const own = ++generation;
      if (typeof provider.self !== 'function') throw Error('customer_identity');
      const self = await provider.self();
      if (own !== generation) return null;
      if (self && (typeof self.userId !== 'string' || !self.userId || typeof self.personId !== 'string' || !self.personId || self.userId !== actorId)) throw Error('customer_identity');
      return customerRouteIds(routeId,self);
    },
  };
}
