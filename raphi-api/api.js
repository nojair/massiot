'use strict'

const debug          = require('debug')('raphi:api:routes')
const express        = require('express')
const asyncify       = require('express-asyncify')
const expressAuth    = require('express-jwt')
const guard          = require('express-jwt-permissions')()
const myConfigs      = require('../common/config')(debug)
const databaseModule = require('raphi-db')

const api = asyncify(express.Router())

const { auth, db } = myConfigs

/*
const { auth, db } = {
  db: {
    database: process.env.DB_NAME || 'raphi_database',
    username: process.env.DB_USER || 'raphi_role',
    password: process.env.DB_PASS || 'raphi_password',
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    logging: s => callback(s)
  },
  auth: {
    secret: process.env.SECRET || 'raphi_secret'
  }
}
*/

let services, Agent, Metric, Receptor

api.use('*', async (req, res, next) => {
  if (!services) {
    debug('Connecting to database')
    try {
      services = await databaseModule(db)
    } catch (e) {
      return next(e)
    }

    Agent    = services.Agent
    Metric   = services.Metric
    Receptor = services.Receptor
  }
  next()
})

api.get('/agents', expressAuth(myConfigs.auth), async (req, res, next) => {
  debug('A request has come to /agents')

  const { user } = req

  if (!user || !user.username) {
    return next(new Error('Not authorized'))
  }

  let agents = []
  try {
    if (user.admin) {
      agents = await Agent.findConnected()
    } else {
      agents = await Agent.findByUsername(user.username)
    }
  } catch (e) {
    return next(e)
  }

  res.send(agents)
})

api.get('/agent/:uuid', async (req, res, next) => {
  const { uuid } = req.params

  debug(`request to /agent/${uuid}`)

  let agent
  try {
    agent = await Agent.findByUuid(uuid)
  } catch (e) {
    return next(e)
  }

  if (!agent) {
    return next(new Error(`Agent not found with uuid ${uuid}`))
  }

  res.send(agent)
})

api.get('/metrics/:uuid', expressAuth(myConfigs.auth), guard.check(['metrics:read']), async (req, res, next) => {
  const { uuid } = req.params

  debug(`request to /metrics/${uuid}`)

  let metrics = []
  try {
    metrics = await Metric.findByAgentUuid(uuid)
  } catch (e) {
    return next(e)
  }

  if (!metrics || metrics.length === 0) {
    return next(new Error(`Metrics not found for agent with uuid ${uuid}`))
  }

  res.send(metrics)
})

api.get('/metrics/:uuid/:type', async (req, res, next) => {
  const { uuid, type } = req.params

  debug(`request to /metrics/${uuid}/${type}`)

  let metrics = []
  try {
    metrics = await Metric.findByTypeAgentUuid(type, uuid)
  } catch (e) {
    return next(e)
  }

  if (!metrics || metrics.length === 0) {
    return next(new Error(`Metrics (${type}) not found for agent with uuid ${uuid}`))
  }

  res.send(metrics)
})

api.get('/receptors/:uuid', expressAuth(myConfigs.auth), guard.check(['receptors:read']), async (req, res, next) => {
  const { uuid } = req.params

  debug(`request to /receptors/${uuid}`)

  let receptors = []
  try {
    receptors = await Receptor.findByAgentUuid(uuid)
  } catch (e) {
    return next(e)
  }

  if (!receptors || receptors.length === 0) {
    return next(new Error(`Receptor not found for agent with uuid ${uuid}`))
  }

  res.send(receptors)
})

api.get('/receptors/:uuid/:name', async (req, res, next) => {
  const { uuid, name } = req.params

  debug(`request to /receptors/${uuid}/${name}`)

  let receptors = []
  try {
    receptors = await Receptor.findByNameAgentUuid(name, uuid)
  } catch (e) {
    return next(e)
  }

  if (!receptors || receptors.length === 0) {
    return next(new Error(`Receptors (${name}) not found for agent with uuid ${uuid}`))
  }

  res.send(receptors)
})

// CHange the follow route to a POST method in the future
api.get('/receptor/update/:uuid/:name/:value', async (req, res, next) => {
  const { uuid, name, value } = req.params

  debug(`request to /receptor/${uuid}/${name}/${value}`)

  let receptor = []
  try {
    receptor = await Receptor.createOrUpdate({name: name, value: value}, uuid)
  } catch (e) {
    return next(e)
  }

  if (!receptor || receptor.length === 0) {
    return next(new Error(`Receptor (${name}) doesn't actualized for agent with uuid ${uuid} with value ${value}`))
  }

  res.send(receptor)
})

module.exports = api
