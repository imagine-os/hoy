import type { TableViewConfig } from '../data/schema';

/** Frontend inventory only. No backend schema, permission or live-connection promise. */
export interface CmsFeatureContract {
  id: string;
  revision: number;
  backendMapping: 'pending';
  subscription: 'local-events';
  tenantField: 'tenant_id';
  identityField: 'id';
  actorScope: string;
  sources: { path: string; sha256: string }[];
  adapterTests: { path: string; sha256: string; reviewedSourceDigest: string; verifies: string }[];
  entities: { name: string; fields: string[]; usage: ('read' | 'command-effect' | 'dependency')[] }[];
  mockExtensions: { entity: string; field: string; type: string; enumValues?: string[]; source: string; reason: string }[];
  pages: {
    code: string;
    route: string;
    routeSource: string;
    specSource: string;
    specAnchor: string;
    routeSpec: string;
    componentSource: string;
    componentExport: string;
    viewKind: 'form-preview' | 'cards' | 'summary-ledger-list' | 'review-list' | 'table-tool';
    specEntities: string[];
    /** All preferences reuse the existing table model; forms have no table preferences. */
    views: { key: string; entity: string; kind: 'list' | 'grid'; config: TableViewConfig }[];
    states: string[];
    fixtureIds: string[];
  }[];
}

/** Small fictional contract samples, not application seed data or test completion evidence. */
export interface CmsFixture {
  id: string;
  sourceDigest: string;
  feature: string;
  page: string;
  state: string;
  rows: { entity: string; values: Record<string, unknown> }[];
}
