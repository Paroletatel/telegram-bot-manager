import { OrganizationInterface } from './interfaces/organization.interface';
import { ContactInterface } from './interfaces/contact.interface';

export interface AppFormDTO {
  userId: string;
  systemName: string;
  surname: string;
  surnameV: boolean;
  name: string;
  nameV: boolean;
  otchestvo: string;
  otchestvoV: boolean;
  birthDate: string;
  birthDateV: boolean;
  tgName: string;
  tgNameV: boolean;
  tgSurname: string;
  tgSurnameV: boolean;
  tgUserName: string;
  tgUserNameV: boolean;
  registrationDate: string;
  constPhone: string;
  constPhoneV: boolean;
  organizations: OrganizationInterface[];
  contacts: ContactInterface[];
  tags: string[];
  recommendations: string[];
}
