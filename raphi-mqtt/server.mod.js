'use strict'

const debug            = require('debug')('raphi:mqtt')
const myConfigs        = require('../common/config')(debug)
const mosca            = require('mosca')
const redis            = require('redis')
const chalk            = require('chalk')
const handleError      = require('../common/error')(chalk)
const databaseModule   = require('raphi-db')
const { parsePayload } = require('./utils')

const backend = {
  type: 'redis', // el tipo de base de datos usada por el servidor MQTT
  redis, // cliente de base de datos usada para redis
  return_buffers: true // el servidor retorna los datos en forma de buffers
}

const settings = {
  port: 1883, // puerto por defecto
  backend
}

const server  = new mosca.Server(settings)
const clients = new Map()
const { db }  = myConfigs

let Agent, Metric, Receptor // estos servicios se declaran aquí para hacerse globales ya que se reciben dentro del evento "ready"

server.on('clientConnected', client => { // evento de MQTT, recibe a un "cliente" (objeto enviado desde un agente)
  debug(`Client Connected: ${client.id}`) // MQTT otorga a ese "cliente" (objeto q recibe) un id específico, NO es el id de nigún agent o metric
  clients.set(client.id, null) // como en este evento no se recibe el mensaje de un emisor de eventos, se setea el client.id a null
  connectedAgent = true
})

server.on('clientDisconnected', async (client) => {
  debug(`Client Disconnected: ${client.id}`)
  const agent = clients.get(client.id) // cuando un cliente se desconecta, del mapa CLIENTES se guarda el objeto asociado a client.id en agente

  if (agent) { // si el objeto agente existe
    agent.connected = false // se cambia connected a false

    try {
      await Agent.createOrUpdate(agent) // y se actualiza ese objeto en la base de datos
    } catch (e) {
      return handleError.simple(e)
    }

    clients.delete(client.id) // luego se borra al cliente desconectado del mapa CLIENTES, pues no lo necesitamos más en el servidor

    server.publish({ // luego se distribuye un mensaje (obvio con su topic y payload! strings!) a los clientes MQTT:
      topic: 'agent/disconnected',
      payload: JSON.stringify({
        agent: {
          uuid: agent.uuid
        }
      })
    })
    debug(`Client (${client.id}) associated to Agent (${agent.uuid}) marked as disconnected`)
  }
})

let connectedAgent
let option = 0
server.on('published', async (packet, client) => { // cuando se publica un mensaje al servidor, este recibe dos objetos (client y packet)
  // packet contiene dos strings: topic (nombre del evento) y payload (cuerpo del mensaje)
  // al trabajar con await en el try catch, el callcack del evento "published" debe ser asíncrono

  debug(`Received: ${packet.topic}`) // eventos creados manualmente para hacer las lógicas de conexión a la base de datos, etc:
                                     // como "agent/connected", "agent/disconnected", "agent/message"

  switch (packet.topic) { // topics son eventos creados manualmente en el emisor de eventos (cliente mqtt)
    case 'agent/connected': // en este caso no se hace nada
    case 'agent/disconnected': // aquí tampoco
      debug(`Payload: ${packet.payload}`) // solo se muestra en el debug el mensaje que llega
      break // y solo nos salimos del switch
    case 'agent/message': // en este caso sí hay mensaje que contiene la info del agl agente, diciendo q está true para conectaado
      debug(`Payload: ${packet.payload}`) // el payload que llega es un string o un buffer, en cualquier caso
      const payload = parsePayload(packet.payload) // conviertiendo el payload a objeto javascript

      let agent, receptors
      if (payload) { // si el payload existe (no es null)
        payload.agent.connected = true // se setea la propiedad connected del agente, diciendo q está true para conectaado

        try {
          agent = await Agent.createOrUpdate(payload.agent)

          option = payload.caseOption

          switch (option) {
            case 1:
              try {
                receptors = await Receptor.findByAgentUuid(agent.uuid)
              } catch (e) {
                return handleError.simple(e)
              }
              debug(`ReceptorES ${receptors} founded in agent ${agent.uuid}`)

              // Store Metrics
              for (let metric of payload.metrics) { // recordar que el payload ya es solo un objeto de javascript con objetos agent y metrics
                // se usa for - of porque soporta async await!, lo cual no sucede con foreach!
                let m

                try {
                  m = await Metric.create(agent.uuid, metric)
                } catch (e) {
                  return handleError.simple(e)
                }

                debug(`Metric ${m.id} saved on agent ${agent.uuid}`)
              }
              break

            case 2:
              receptors = {}
              debug(`ReceptorES ${receptors} NOT founded in agent ${agent.uuid}`)

              // Store Metrics
              for (let metric of payload.metrics) { // recordar que el payload ya es solo un objeto de javascript con objetos agent y metrics
                // se usa for - of porque soporta async await!, lo cual no sucede con foreach!
                let m

                try {
                  m = await Metric.create(agent.uuid, metric)
                } catch (e) {
                  return handleError.simple(e)
                }

                debug(`Metric ${m.id} saved on agent ${agent.uuid}`)
              }
              break

            case 3:
              try {
                receptors = await Receptor.findByAgentUuid(agent.uuid)
              } catch (e) {
                return handleError.simple(e)
              }
              debug(`ReceptorES ${receptors} founded in agent ${agent.uuid}`)
              debug(`Metric NOT founded in agent ${agent.uuid}`)
              break

            case 4:
              try {
                receptors = await Receptor.findByAgentUuid(agent.uuid)
              } catch (e) {
                return handleError.simple(e)
              }
              debug(`ReceptorES ${receptors} founded in agent ${agent.uuid}`)
              metrics = payload.metrics
              break
          }

          if (connectedAgent && !clients.get(client.id)) {
            if (payload.metrics.length > 0 && payload.receptors.length > 0) { // SENSORS AND ACTUATORS
              connectedAgent = false
              receptors = payload.receptors
              for (let receptor of receptors) { // recordar que el payload ya es solo un objeto de javascript con objetos agent y metrics
                // se usa for - of porque soporta async await!, lo cual no sucede con foreach!

                let r

                try {
                  r = await Receptor.create(agent.uuid, receptor)
                } catch (e) {
                  return handleError.simple(e)
                }

                debug(`Receptor ${r.id} saved on agent ${agent.uuid}`)
              }

              // Store Metrics
              for (let metric of payload.metrics) { // recordar que el payload ya es solo un objeto de javascript con objetos agent y metrics
                // se usa for - of porque soporta async await!, lo cual no sucede con foreach!
                let m

                try {
                  m = await Metric.create(agent.uuid, metric)
                } catch (e) {
                  return handleError.simple(e)
                }

                debug(`Metric ${m.id} saved on agent ${agent.uuid}`)
              }

            } else if (payload.metrics.length > 0 && payload.receptors.length === 0) { // SENSORS
              connectedAgent = false
              receptors = {}
              debug(`ReceptorES ${receptors} NOT founded in agent ${agent.uuid}`)

              // Store Metrics
              for (let metric of payload.metrics) { // recordar que el payload ya es solo un objeto de javascript con objetos agent y metrics
                // se usa for - of porque soporta async await!, lo cual no sucede con foreach!
                let m

                try {
                  m = await Metric.create(agent.uuid, metric)
                } catch (e) {
                  return handleError.simple(e)
                }

                debug(`Metric ${m.id} saved on agent ${agent.uuid}`)
              }

            } else if (payload.metrics.length === 0 && payload.receptors.length > 0) { // ACTUATORS
              connectedAgent = false
              receptors = payload.receptors
              for (let receptor of receptors) { // recordar que el payload ya es solo un objeto de javascript con objetos agent y metrics
                // se usa for - of porque soporta async await!, lo cual no sucede con foreach!

                let r

                try {
                  r = await Receptor.create(agent.uuid, receptor)
                } catch (e) {
                  return handleError.simple(e)
                }

                debug(`Receptor ${r.id} saved on agent ${agent.uuid}`)
              }
              debug(`Metric NOT found in this case: agent ${agent.uuid}`)

            } else {
              connectedAgent = false
              try {
                receptors = await Receptor.findByAgentUuid(agent.uuid)
              } catch (e) {
                return handleError.simple(e)
              }
            }
        }

      } catch (e) {
        // si hay algun error lo maneja y continua
        return handleError.simple(e)
      }

      debug(`Agent ${agent.uuid} saved`)

      // Notify Agent is Connected
      if (!clients.get(client.id)) { // si el cliente creado por MQTT (asociado a client.id) es distinto a null
        clients.set(client.id, agent) // se setea client.id para que ahora apunte al objeto agent y todo esto se guarde en el mapa CLIENTS y

          server.publish({ // se le pide al servidor publicar dos mensajes STRING: un topic y un payload (este es un payload distinto al de más arriba obvio!!! -.- )
            topic: 'agent/connected', 
            payload: JSON.stringify({
              agent: {
                uuid: agent.uuid,
                name: agent.name,
                hostname: agent.hostname,
                pid: agent.pid,
                connected: agent.connected
              }
            })
          }) // y así se logra recibir un topic y un payload de un agente y luego se envía un topic y un payload a los clientes MQTT suscritos y conectados
        }

      }

      server.publish({ // se le pide al servidor publicar dos mensajes STRING: un topic y un payload (este es un payload distinto al de más arriba obvio!!! -.- )
        topic: 'agent/receptors',
        payload: JSON.stringify({
          agent: {
            uuid: agent.uuid,
            name: agent.name,
            hostname: agent.hostname,
            pid: agent.pid,
            connected: agent.connected
          },
          receptors: receptors
        })
      })
      break

  }
})

server.on('ready', async () => {
  const services = await databaseModule(db).catch(handleError.fatal)

  Agent = services.Agent
  Metric = services.Metric
  Receptor = services.Receptor

  console.log(`${chalk.green('[raphi-mqtt]')} server is running`)
})

server.on('error', handleError.fatal)

process.on('uncaughtException', handleError.fatal)
process.on('unhandledRejection', handleError.fatal)
