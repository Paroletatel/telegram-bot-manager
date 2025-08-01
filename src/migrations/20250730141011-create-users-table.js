'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      telegram_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      first_name: {
        type: Sequelize.STRING,
        allowNull: true
      },
      username: {
        type: Sequelize.STRING,
        allowNull: true
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

    // Добавляем индекс для telegram_id
    await queryInterface.addIndex('users', ['telegram_id'], {
      unique: true,
      name: 'users_telegram_id_idx'
    });
  },

  async down (queryInterface, Sequelize) {
    // Удаляем индекс
    await queryInterface.removeIndex('users', 'users_telegram_id_idx');
    // Удаляем таблицу
    await queryInterface.dropTable('users');
  }
};
