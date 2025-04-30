import { Term } from '../highlighter';

export interface Grammar {
  simpleTerms: Record<string, Term>;
  complexTerms: string[];
  complexScopes: Record<string, Term>;
}
