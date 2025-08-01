import { SetMetadata } from '@nestjs/common';
import { RoleTypeEnum } from './roles.service';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleTypeEnum[]) => SetMetadata(ROLES_KEY, roles);
