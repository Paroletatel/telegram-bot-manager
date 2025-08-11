import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Form } from "../forms/models/form.model";
import { Op } from "sequelize";

@Injectable()
export class SearchService {
  constructor(@InjectModel(Form) private formRepository: typeof Form) {}

  async findFormByINN(inn: string) {
    const forms = await this.formRepository.findAll({
      where: {
        organizations: {
          [Op.iLike]: `%${inn}%`,
        },
      },
    });
    return forms;
  }

  async findFormByPhone(phone: string) {
    const inContacts = await this.formRepository.findAll({
      where: {
        contacts: {
          [Op.iLike]: `%${phone}%`,
        },
      },
    });

    const inPhone = await this.formRepository.findAll({
      where: {
        constPhone: {
          [Op.iLike]: `%${phone}%`,
        },
      },
    });

    return inPhone.concat(inContacts);
  }

  async findFormBySystemName(name: string) {
    return await this.formRepository.findAll({
      where: {
        systemName: {
          [Op.iLike]: `%${name}%`,
        },
      },
    });
  }

  async findFormByName(name: string) {
    return await this.formRepository.findAll({
      where: {
        name: {
          [Op.iLike]: `%${name}%`,
        },
      },
    });
  }

  async findFormBySurname(name: string) {
    return await this.formRepository.findAll({
      where: {
        surname: {
          [Op.iLike]: `%${name}%`,
        },
      },
    });
  }

  async findFormByUsername(name: string) {
    return await this.formRepository.findAll({
      where: {
        tgUserName: {
          [Op.iLike]: `%${name}%`,
        },
      },
    });
  }

  async findFormByINNActive(inn: string) {
    const forms = await this.formRepository.findAll({
      where: {
        organizations: {
          [Op.iLike]: `%${inn}%`,
        },
        searchAvailability: true,
      },
    });
    return forms;
  }

  async findFormByPhoneActive(phone: string) {
    const inContacts = await this.formRepository.findAll({
      where: {
        contacts: {
          [Op.iLike]: `%${phone}%`,
        },
        searchAvailability: true,
      },
    });

    const inPhone = await this.formRepository.findAll({
      where: {
        constPhone: {
          [Op.iLike]: `%${phone}%`,
        },
        searchAvailability: true,
      },
    });

    return inPhone.concat(inContacts);
  }

  async findFormBySystemNameActive(name: string) {
    return await this.formRepository.findAll({
      where: {
        systemName: {
          [Op.iLike]: `%${name}%`,
        },
        searchAvailability: true,
      },
    });
  }

  async findFormByNameActive(name: string) {
    return await this.formRepository.findAll({
      where: {
        name: {
          [Op.iLike]: `%${name}%`,
        },
        searchAvailability: true,
      },
    });
  }

  async findFormBySurnameActive(name: string) {
    return await this.formRepository.findAll({
      where: {
        surname: {
          [Op.iLike]: `%${name}%`,
        },
        searchAvailability: true,
      },
    });
  }

  async findFormByUsernameActive(name: string) {
    return await this.formRepository.findAll({
      where: {
        tgUserName: {
          [Op.iLike]: `%${name}%`,
        },
        searchAvailability: true,
      },
    });
  }

  async adminVectorSearch(query: string) {
    //TODO ЗАГЛУШКА
    // const resp = await axios.post(
    //   process.env.VECTOR_SEARCH_URL + '/search/allFields',
    //   { query },
    // );
    // return resp.data;
    return null;
  }
}
