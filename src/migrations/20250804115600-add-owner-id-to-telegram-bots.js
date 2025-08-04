'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('telegram_bots', 'owner_id', {
      type: Sequelize.BIGINT,
      allowNull: false,
      defaultValue: 0, // Временное значение по умолчанию
    });

    // Добавляем индекс для быстрого поиска ботов по владельцу
    await queryInterface.addIndex('telegram_bots', ['owner_id'], {
      name: 'telegram_bots_owner_id_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    // Удаляем индекс
    await queryInterface.removeIndex('telegram_bots', 'telegram_bots_owner_id_idx');
    // Удаляем колонку
    await queryInterface.removeColumn('telegram_bots', 'owner_id');
  }
};
