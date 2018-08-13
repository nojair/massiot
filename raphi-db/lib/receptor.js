'use strict'

module.exports = function setupReceptor (ReceptorModel, AgentModel) {
  async function findByAgentUuid (uuid) {
    return ReceptorModel.findAll({
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
      attributes: [ 'id', 'name', 'value', 'createdAt' ],
      group: [ 'name' ],
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

  async function settingPoint (value, name, uuid) {
    const agent = await AgentModel.findOne({
      where: { uuid }
    })

    const receptor = await ReceptorModel.findOne({
      where: { agentId: agent.Id }
    })

    if (receptor) {
      Object.assign(receptor, { value: value, name: name })
      const result = await ReceptorModel.update(receptor)
      return result.toJSON()
    }
  }

  return {
    create,
    findByAgentUuid,
    settingPoint,
    findAll,
    findByNameAgentUuid
  }
}

// Entrega un OBJ. que posee métodos que permiten hacer distintas operaciones sobre el modelo METRIC
