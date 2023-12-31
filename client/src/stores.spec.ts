import { describe, it, expect, beforeAll } from "vitest"
import { getMessageStore, Message } from "./stores"
import nodeFetch from "node-fetch"
import { type RequestInit as NodeFetchRequestInit } from "node-fetch"
import app from "../../fake-server/src/app"
import { promises as fs } from "fs"
import type { Readable } from "svelte/store"

const port = 3000
const dataPath = "tmp/data"

const url = (path: string) => `http://localhost:${port}${path}`

// patch the full URL into our fetch calls so they'll hit the server
window.fetch = async (path, init) => {
  return nodeFetch(
    url(path.toString()),
    init as NodeFetchRequestInit,
  ) as unknown as Promise<Response>
}

const server = {
  reset: async () => await nodeFetch(url("/messages"), { method: "delete" }),
  messagesList: async () =>
    (await (await nodeFetch(url("/messages-list"))).text()).split("\n"),
  send: async (message: Message) => {
    await nodeFetch(url("/messages"), {
      method: "POST",
      body: new URLSearchParams(message.toJSON()),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
    })
  },
}

describe(getMessageStore.name, () => {
  beforeAll(async () => {
    await app(dataPath).then((server) => server.listen(port))
  })
  beforeEach(async () => await server.reset())

  it("sends a message", async () => {
    const store = getMessageStore()
    await store.send(a.message())
    expect((await fs.readdir(dataPath)).length).toEqual(1)
    expect((await server.messagesList()).length).toEqual(1)
  })

  describe("init", () => {
    describe("when there are no messages on the server", () => {
      it("populates with an empty list", async () => {
        const store = getMessageStore()
        await store.init()
        const messages = await subscriberUpdateFrom(store)
        expect(messages).toEqual([])
      })
    })

    describe("when messages exist on the server", () => {
      beforeEach(async () => {
        await server.send(a.message({ time: "1", message: "one" }))
        await server.send(a.message({ time: "2", message: "two" }))
      })

      it("populates with the messages from the server", async () => {
        const store = getMessageStore()
        await store.init()
        const messages = await subscriberUpdateFrom(store)
        expect(
          messages
            .sort((a, b) => Number(a.time) - Number(b.time))
            .map((message) => message.message),
        ).toEqual(["one", "two"])
      })
    })
  })

  describe("refresh", () => {
    it("populates with new messages that have arrived on the server", async () => {
      const store = getMessageStore()
      await store.init()
      await server.send(a.message({ message: "hello" }))
      await store.refresh()
      const messages = await subscriberUpdateFrom(store)
      expect(messages.map((message) => message.message)).toEqual(["hello"])
    })

    describe("when messages exist on the server that the client doesn't have", () => {
      it("merges them together", async () => {
        await repeat(3, () => server.send(a.message()))
        const store = getMessageStore()
        await store.init()
        await repeat(10, () => server.send(a.message()))
        await store.refresh()
        const messages = await subscriberUpdateFrom(store)
        expect(messages.length).toEqual(13)
      })
    })

    describe("when messages exist on the client that the server doesn't have", () => {
      it("merges them together", async () => {
        const store = getMessageStore()
        await store.init()
        await repeat(3, () => store.send(a.message()))
        await withServerOffline(async () => {
          await repeat(10, () => store.send(a.message()))
        })
        await store.refresh()
        const messages = await subscriberUpdateFrom(store)
        expect(messages.length).toEqual(13)
        expect((await server.messagesList()).length).toEqual(13)
      })
    })
  })

  describe("message sent status", () => {
    it("marks a sent message as sent", async () => {
      const store = getMessageStore()
      await store.send(a.message())
      const messages = await subscriberUpdateFrom(store)
      expect(messages[0].sent).toEqual(true)
    })

    it("marks a message as not sent if it fails to send", async () => {
      const store = getMessageStore()
      await withServerOffline(async () => {
        await store.send(a.message())
      })
      const messages = await subscriberUpdateFrom(store)
      expect(messages[0].sent).toEqual(false)
    })

    it("marks an unsent message as sent if it succeeds", async () => {
      const store = getMessageStore()
      await withServerOffline(async () => {
        await store.send(a.message())
      })
      await store.refresh()
      const messages = await subscriberUpdateFrom(store)
      expect(messages[0].sent).toEqual(true)
    })
  })
})

async function repeat(iterations: number, action: () => Promise<void>) {
  return Promise.all([...Array(iterations).keys()].map(action))
}

async function subscriberUpdateFrom<T>(store: Readable<T>) {
  return new Promise<T>((resolve) => {
    store.subscribe(resolve)
  })
}

const a = {
  message: (props: Partial<Message> = {}) =>
    Message.from({
      time: String(next("time")),
      message: `A message ${next("message")}`,
      user: `An Author ${next("user")}`,
      ...props,
    }),
}

const sequence = {
  time: 0,
  message: 0,
  user: 0,
}

const next = (type: "time" | "message" | "user") => sequence[type]++

async function withServerOffline(cb: () => Promise<void>) {
  const originalFetch = window.fetch
  window.fetch = () => Promise.resolve(new Response(null, { status: 500 }))
  await cb()
  window.fetch = originalFetch
}
