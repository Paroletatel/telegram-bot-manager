export type contactType = 'email' | 'phone' | 'constPhone';

export interface ContactInterface {
  type: contactType;
  value: string;
  visibility: boolean;
}
