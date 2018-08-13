'use strict'

const setupDatabase      = require('./lib/db')
const setupAgentModel    = require('./models/agent')
const setupMetricModel   = require('./models/metric')
const setupReceptorModel = require('./models/receptor')
const setupAgent         = require('./lib/agent')
const setupMetric        = require('./lib/metric')
const setupReceptor      = require('./lib/receptor')
const defaults           = require('defaults')

module.exports = async function (config) {
  config = defaults(config, {
    dialect: 'sqlite',
    pool: {
      max: 10,
      min: 0,
      idle: 10000
    },
    query: {
      raw: true
    }
  })

  const sequelize   = setupDatabase(config)
  const AgentModel  = setupAgentModel(config)
  const MetricModel = setupMetricModel(config)
  const ReceptorModel = setupReceptorModel(config)

  AgentModel.hasMany(MetricModel)
  MetricModel.belongsTo(AgentModel)

  AgentModel.hasMany(ReceptorModel)
  ReceptorModel.belongsTo(AgentModel)

  await sequelize.authenticate()

  if (config.setup) {
    await sequelize.sync({ force: true })
  }

  const Agent  = setupAgent(AgentModel)
  const Receptor = setupReceptor(ReceptorModel, AgentModel)
  const Metric = setupMetric(MetricModel, AgentModel)

  return {
    Agent,
    Metric,
    Receptor
  }
}

// Entrega los OBJ. AGENT, METRIC y RCEPTOR de acuerdo a sus modelos y con sendos métodos

// Al ser usado por setup,js, crea las tablas Agents, Metrics y Receptors
