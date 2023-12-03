class Topic {
  constructor (name) {
    this.name = name
    this.messages = []
    this.listeners = []
  }

  set (message) {
    this.messages.push(message)
    for (const listener of this.listeners) {
      listener(message, this.messages.indexOf(message))
    }
  }

  map () {
    return {
      on: listener => {
        this.listeners.push(listener)
      }
    }
  }

  off () {
    console.log('off')
  }
}

class Db {
  constructor () {
    this.topics = {}
  }

  get (topic) {
    if (!this.topics[topic]) this.topics[topic] = new Topic(topic)
    return this.topics[topic]
  }
}

export const db = new Db()
