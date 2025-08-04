'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Добавляем колонку updated_at в таблицу role_types
    await queryInterface.addColumn('role_types', 'updated_at', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: Sequelize.NOW
    });

    // Обновляем существующие записи, установив updated_at = created_at
    await queryInterface.sequelize.query(
      'UPDATE role_types SET updated_at = created_at WHERE updated_at IS NULL;'
    );

    // Делаем колонку NOT NULL после обновления всех записей
    await queryInterface.changeColumn('role_types', 'updated_at', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    });
  },

  async down(queryInterface, Sequelize) {
    // Удаляем колонку при откате миграции
    await queryInterface.removeColumn('role_types', 'updated_at');
  }
};
