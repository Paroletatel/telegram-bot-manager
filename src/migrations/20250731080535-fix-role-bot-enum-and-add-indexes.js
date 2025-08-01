'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Добавляем индексы для улучшения производительности запросов
    await queryInterface.addIndex('role_bots', ['bot_id', 'role_type_code'], {
      name: 'role_bots_bot_id_role_type_code_idx'
    });

    await queryInterface.addIndex('role_bots', ['user_id', 'bot_id'], {
      name: 'role_bots_user_id_bot_id_idx',
      unique: true
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the indexes
    await queryInterface.removeIndex('role_bots', 'role_bots_bot_id_role_type_code_idx');
    await queryInterface.removeIndex('role_bots', 'role_bots_user_id_bot_id_idx');
  }
};
