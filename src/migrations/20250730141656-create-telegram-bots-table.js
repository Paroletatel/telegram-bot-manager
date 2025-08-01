'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('telegram_bots', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      token: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      config: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Добавляем индексы
    await queryInterface.addIndex('telegram_bots', ['token'], {
      unique: true,
      name: 'telegram_bots_token_idx'
    });
  },

  async down (queryInterface, Sequelize) {
    // Удаляем индексы
    await queryInterface.removeIndex('telegram_bots', 'telegram_bots_token_idx');
    // Удаляем таблицу
    await queryInterface.dropTable('telegram_bots');
  }
};
