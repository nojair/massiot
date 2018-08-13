'use strict'

const db = require('../')

async function run () {
  const config = {
    database: process.env.DB_NAME || 'raphi_database',
    username: process.env.DB_USER || 'raphi_role',
    password: process.env.DB_PASS || 'raphi_password',
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres'
  }

  const { Agent, Metric, Receptor } = await db(config).catch(handleFatalError)

  const agent = await Agent.createOrUpdate({
    uuid: 'wwww',
    name: 'test',
    username: 'test',
    hostname: 'test',
    pid: 1,
    connected: true
  }).catch(handleFatalError)

  console.log('--agent--')
  console.log(agent)

  const agents = await Agent.findAll().catch(handleFatalError)
  console.log('--agents--')
  console.log(agents)

  const metrics = await Metric.findByAgentUuid(agent.uuid).catch(handleFatalError)
  console.log('--metrics--')
  console.log(metrics)

  const metricTotal = await Metric.findAll().catch(handleFatalError) 
  console.log("--metricsTOTAL--")
  console.log(metricTotal)

  const metric = await Metric.create(agent.uuid, {
    type: 'memory',
    value: '300',
  }).catch(handleFatalError)
  console.log('--metric--')
  console.log(metric)

  /*
  setInterval(async () => {
    let aver = await Metric.findByNatureAgentUuid('actuator', agent.uuid).catch(handleFatalError) // y se actualiza ese objeto en la base de datos
    console.log('--AVEEEEEEEEEEEEEEER--')
    for (let a of aver) {
      console.log(a.id)
    }
  }, 1000)
  */

  const metricsByType = await Metric.findByTypeAgentUuid('memory', agent.uuid).catch(handleFatalError)
  console.log('--metricsByType--')
  console.log(metricsByType)

  const receptors = await Receptor.findByAgentUuid(agent.uuid).catch(handleFatalError)
  console.log("----- RECEPTORSSSSSS ------")
  console.log(receptors)

}
function handleFatalError (err) {
  console.error(err.message)
  console.error(err.stack)
  process.exit(1)
}

run()
