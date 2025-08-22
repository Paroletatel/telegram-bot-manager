'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Создаем перечисление для ролей, если оно еще не существует
    await queryInterface.sequelize.query(
      "CREATE TYPE \"enum_role_types_code\" AS ENUM('user', 'admin')",
    );

    // Создаем таблицу role_types
    await queryInterface.createTable('role_types', {
      code: {
        type: 'enum_role_types_code',
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Добавляем начальные данные
    await queryInterface.bulkInsert('role_types', [
      {
        code: 'user',
        name: 'Обычный пользователь',
        description: 'Стандартные права доступа',
        created_at: new Date(),
      },
      {
        code: 'admin',
        name: 'Администратор',
        description: 'Полные права доступа',
        created_at: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    // Удаляем таблицу
    await queryInterface.dropTable('role_types');

    // Удаляем перечисление
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_role_types_code"');
  },
};
