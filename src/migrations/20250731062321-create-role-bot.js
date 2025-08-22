'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Проверяем существование типа enum_role_types_code
    const enumExists = await queryInterface.sequelize.query(
      "SELECT 1 FROM pg_type WHERE typname = 'enum_role_types_code'",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    if (enumExists.length === 0) {
      await queryInterface.sequelize.query(
        "CREATE TYPE \"enum_role_types_code\" AS ENUM('user', 'admin')",
      );
    }

    // Создаем таблицу role_bots
    await queryInterface.createTable('role_bots', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      bot_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'telegram_bots',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      role_type_code: {
        type: 'enum_role_types_code',
        allowNull: false,
        references: {
          model: 'role_types',
          key: 'code',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add a unique constraint to prevent duplicate role assignments
    await queryInterface.addConstraint('role_bots', {
      fields: ['user_id', 'bot_id', 'role_type_code'],
      type: 'unique',
      name: 'role_bots_user_bot_role_unique',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('role_bots');
  },
};
