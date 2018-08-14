'use strict'

module.exports = function setupReceptor (ReceptorModel, AgentModel) {
  async function findByAgentUuid (uuid) {
    return ReceptorModel.findAll({
      attributes: [ 'name', 'value' ],
      include: [{
        attributes: [],
        model: AgentModel,
        where: {
          uuid
        }
      }],
      raw: true
    })
  }

  async function findByNameAgentUuid (name, uuid) {
    return ReceptorModel.findAll({
      attributes: [ 'id', 'name', 'value' ],
      limit: 20,
      order: [[ 'createdAt', 'DESC' ]],
      include: [{
        attributes: [],
        model: AgentModel,
        where: {
          uuid
        }
      }],
      raw: true
    })
  }

  async function findAll () {
    const result = await ReceptorModel.findAll() // will be an array of all Project instances
    return result
  }

  async function create (uuid, receptor) {
    const agent = await AgentModel.findOne({
      where: { uuid }
    })

    if (agent) {
      Object.assign(receptor, { agentId: agent.id })
      const result = await ReceptorModel.create(receptor)
      return result.toJSON()
    }
  }

  async function createOrUpdate(receptor, uuid) {
    const agent = await AgentModel.findOne({
      where: {
        uuid: uuid
      }
    })

    const cond = {
      where: {
        agentId: agent.id,
        name: receptor.name
      }
    }

    const existingReceptor = await ReceptorModel.findOne(cond)

    console.log("==================JUSTUPDATE======================")
    console.log(cond)
    if (existingReceptor) {
      const updated = await ReceptorModel.update(receptor, cond)
      return updated ? ReceptorModel.findOne(cond) : existingReceptor
    }

    const result = await ReceptorModel.create(receptor)
    return result.toJSON()
  }

  return {
    create,
    findByAgentUuid,
    createOrUpdate,
    findAll,
    findByNameAgentUuid
  }
}

// Entrega un OBJ. que posee métodos que permiten hacer distintas operaciones sobre el modelo METRIC
