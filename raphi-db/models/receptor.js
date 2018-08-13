'use strict'

const Sequelize = require('sequelize')
const setupDatabase = require('../lib/db')

module.exports = function setupReceptorModel (config) {
  const sequelize = setupDatabase(config)

  return sequelize.define('receptor', {
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    value: {
      type: Sequelize.TEXT,
      allowNull: false
    }
  })
}

// Define un modelo METRIC en nuestra base de datos
