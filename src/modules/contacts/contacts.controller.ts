import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ContactsService } from './contacts.service';

@Controller('contacts')
export class ContactsController {
  constructor(private contactsService: ContactsService) {}

  @Post('/addUserToContact')
  putValueInFormField(
    @Body('userId') userId: string,
    @Body('contactUserId') contactUserId: string,
  ) {
    return this.contactsService.addUserToContact(userId, contactUserId);
  }

  @Get('/getUsersContacts/:userId')
  getUsersContacts(@Param('userId') userId: string) {
    return this.contactsService.getUsersContacts(userId);
  }

  @Post('/deleteUserFromContact')
  deleteUserFromContact(
    @Body('userId') userId: string,
    @Body('contactUserId') contactUserId: string,
  ) {
    return this.contactsService.deleteUserFromContact(userId, contactUserId);
  }
}
