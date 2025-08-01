'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class RoleBot extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  RoleBot.init({
    userId: DataTypes.UUID,
    botId: DataTypes.UUID,
    roleTypeCode: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'RoleBot',
  });
  return RoleBot;
};