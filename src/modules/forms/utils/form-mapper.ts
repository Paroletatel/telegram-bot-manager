import { AppFormDTO } from '../app-form.dto';
import { AppFormBodyDto } from '../dto/app-form-body.dto';
import { ContactInterface } from '../interfaces/contact.interface';
import { OrganizationInterface } from '../interfaces/organization.interface';

export function mapToAppFormDTO(input: AppFormBodyDto): AppFormDTO {
  return {
    userId: input.userId,
    botId: input.botId,
    systemName: input.systemName ?? '',
    surname: input.surname ?? '',
    surnameV: input.surnameV ?? false,
    name: input.name ?? '',
    nameV: input.nameV ?? false,
    otchestvo: input.otchestvo ?? '',
    otchestvoV: input.otchestvoV ?? false,
    birthDate: input.birthDate ?? '',
    birthDateV: input.birthDateV ?? false,
    tgName: input.tgName ?? '',
    tgNameV: input.tgNameV ?? false,
    tgSurname: input.tgSurname ?? '',
    tgSurnameV: input.tgSurnameV ?? false,
    tgUserName: input.tgUserName ?? '',
    tgUserNameV: input.tgUserNameV ?? false,
    registrationDate: input.registrationDate ?? '',
    constPhone: input.constPhone ?? input.phoneNumber ?? '',
    constPhoneV: input.constPhoneV ?? false,
    organizations: (input.organizations as OrganizationInterface[]) ?? [],
    contacts: (input.contacts as ContactInterface[]) ?? [],
    tags: input.tags ?? [],
    recommendations: input.recommendations ?? [],
  } as AppFormDTO;
}
