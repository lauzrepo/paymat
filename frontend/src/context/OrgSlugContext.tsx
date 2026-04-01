import { createContext, useContext } from 'react';

export const OrgSlugContext = createContext<string>('');

export function useOrgSlug(): string {
  return useContext(OrgSlugContext);
}
