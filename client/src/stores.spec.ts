import { describe, it, expect } from "vitest"
import { getMessageStore, type Message } from "./stores"
import nodeFetch from "node-fetch"
import { type RequestInit as NodeFetchRequestInit } from "node-fetch"
import app from "../../fake-server/src/app"
import { promises as fs } from "fs"

const port = 3000
const dataPath = "tmp/data"
app(dataPath).listen(port)

// patch the full URL into our fetch calls so they'll hit the server
window.fetch = async (path, init) => {
  return nodeFetch(
    `http://localhost:${port}${path}`,
    init as NodeFetchRequestInit,
  ) as unknown as Promise<Response>
}

const server = {
  reset: async () => await fetch("/messages", { method: "delete" }),
  messagesList: async () =>
    (await (await fetch("/messages-list")).text()).split("\n"),
  send: async (message: Message) => {
    await fetch("/messages", {
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
    await store.send({
      time: new Date().getTime().toString(),
      message: "A message",
      user: "An Author",
    })
    expect((await fs.readdir(dataPath)).length).toEqual(1)
    expect((await server.messagesList()).length).toEqual(1)
  })

  describe("init", () => {
    describe("when messages exist on the server", () => {
      beforeEach(async () => {
        await server.send({
          time: "123",
          message: "A message",
          user: "An Author",
        })
        await server.send({
          time: "456",
          message: "Another message",
          user: "An Author",
        })
      })

      it("populates with the messages from the server", async () => {
        const store = getMessageStore()
        await store.init()
        const messages = await new Promise<Message[]>((resolve) => {
          store.subscribe(resolve)
        })
        expect(
          messages
            .sort((a, b) => Number(a.time) - Number(b.time))
            .map((message) => message.message),
        ).toEqual(["A message", "Another message"])
      })
    })
  })
})
