const RaphiAgent = require('../')

const agent = new RaphiAgent({
  name: 'Rose',
  username: 'Yair',
  interval: 2000
})

agent.connect()

// This agent only
agent.on('connected', handler)
agent.on('disconnected', handler)
agent.on('message', handler)

// Other Agents
agent.on('agent/connected', handler)
agent.on('agent/disconnected', handler)
agent.on('agent/message', handler)

function handler (payload) {
  console.log(payload)
}
