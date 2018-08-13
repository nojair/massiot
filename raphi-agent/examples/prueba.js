const RaphiAgent = require('../')

const agent = new RaphiAgent({
  name: 'Lettuce',
  username: 'Irvin',
  interval: 2000
})

agent.addReceptor('B', () => {
  return Math.random() * 100
})

agent.addReceptor('D', () => {
  return Math.random() * 100
})

agent.addReceptor('G', () => {
  return Math.random() * 100
})

agent.connect()

/*
// This agent only
agent.on('connected', handler)
agent.on('disconnected', handler)
agent.on('message', handler)

// Other Agents
agent.on('agent/connected', handler)
agent.on('agent/disconnected', handler)
agent.on('agent/message', handler)
 */
agent.on('agent/receptors', handler)

function handler (payload) {
  console.log(payload)
}
