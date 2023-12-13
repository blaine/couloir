import { promises as fs } from "fs"
import nodeFetch, { type RequestInit as NodeFetchRequestInit } from "node-fetch"
import type { Readable } from "svelte/store"
import { describe, expect, it } from "vitest"
import app from "../../fake-server/src/app"
import { getMessageStore, type Message } from "./stores"

const port = 3000
const dataPath = "tmp/data"
app(dataPath).listen(port)

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
      body: new URLSearchParams(message),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
    })
  },
}

describe(getMessageStore.name, () => {
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
        expect(messages.list).toEqual([])
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
          messages.list
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
      expect(messages.list.map((message) => message.message)).toEqual(["hello"])
    })

    describe("when different messages exist on the client and server", () => {
      it("merges them together", async () => {
        await repeat(3, () => server.send(a.message()))
        const store = getMessageStore()
        await store.init()
        await repeat(10, () => server.send(a.message()))
        await store.refresh()
        const messages = await subscriberUpdateFrom(store)
        expect(messages.list.length).toEqual(13)
      })
    })

    describe("if the connection to the server goes offline", () => {
      it("sets the conection status", async () => {
        const store = getMessageStore()
        await store.init()
        await withServerOffline(async () => {
          await store.refresh()
          const { connection: whileOffline } = await subscriberUpdateFrom(store)
          expect(whileOffline).toEqual("offline")
        })
        await store.refresh()
        const { connection: afterReconnection } =
          await subscriberUpdateFrom(store)
        expect(afterReconnection).toEqual("online")
      })
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
  message: (props: Partial<Message> = {}) => ({
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
