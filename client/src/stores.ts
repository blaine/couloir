import { get, writable } from "svelte/store"

function localStorageStore({
  storageKey,
  initialValue = "",
}: {
  storageKey: string
  initialValue?: string
}) {
  const init = localStorage.getItem(storageKey) || initialValue

  const { subscribe, update, set } = writable(init)

  subscribe((state) => {
    if (state) localStorage.setItem(storageKey, state)
  })

  return {
    subscribe,
    update,
    set,
  }
}

export const nav = localStorageStore({
  storageKey: "chat_nav",
  initialValue: "messages",
})

export const user = localStorageStore({ storageKey: "chat_user" })

export class Message {
  static from({
    message,
    user,
    time,
    sent = true,
  }: {
    message: string
    user: string
    time: string
    sent?: boolean
  }): Message {
    return new Message(message, user, time, sent)
  }
  constructor(
    public readonly message: string,
    public readonly user: string,
    public readonly time: string,
    public readonly sent = false,
  ) {}

  equalTo(other: Message): boolean {
    return (
      this.message === other.message &&
      this.user === other.user &&
      this.time === other.time
    )
  }

  withSentStatus(ok: boolean): Message {
    return new Message(this.message, this.user, this.time, ok)
  }

  public toJSON() {
    return {
      message: this.message,
      user: this.user,
      time: this.time,
    }
  }

  public async toHash(): Promise<string> {
    const json = JSON.stringify(this)
    const msgUint8 = new TextEncoder().encode(json) // encode as (utf-8) Uint8Array
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8) // hash the message
    const hashArray = Array.from(new Uint8Array(hashBuffer)) // convert buffer to byte array
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("") // convert bytes to hex string
  }
}

export function getMessageStore() {
  const messages = writable<Message[]>([])
  const { subscribe, update, set } = messages

  const sendMessages = async () => {
    const unsent = get(messages)
      .map(Message.from)
      .filter((message) => !message.sent)
    for (const message of unsent) {
      const response = await fetch("/messages", {
        method: "POST",
        body: new URLSearchParams(message.toJSON()),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
      })
      update((messages) =>
        messages.map((someMessage) =>
          someMessage.equalTo(message)
            ? message.withSentStatus(response.ok)
            : someMessage,
        ),
      )
    }
  }

  const getMessages = async () => {
    const messageListReq = await fetch("/messages-list")
    const messageListRaw = await messageListReq.text()
    const messageList = messageListRaw === "" ? [] : messageListRaw.split("\n")

    const localShas = await Promise.all(
      get(messages)
        .map(Message.from)
        .map(async (message) => await message.toHash()),
    )

    let ranges = []
    let start = -1
    let end = -1
    for (let i = 0; i < messageList.length; i++) {
      if (localShas.includes(messageList[i])) {
        if (start !== -1) {
          ranges.push(`${start}-${end}`)
        }
        start = -1
      } else {
        if (start === -1) start = i
        end = i
      }
    }

    if (start !== -1) ranges.push(`${start}-${end}`)

    if (ranges.length === 0) {
      return
    }

    const messagesReq = await fetch(`/messages?q=${ranges.join(",")}`, {
      headers: { "if-match": `${messageList.length}` },
    })

    if (messagesReq.status !== 200) {
      throw new Error(await messagesReq.text())
    }

    const messagesText = await messagesReq.text()
    const serverMessages = messagesText
      .split("\n")
      .filter((v) => v != "")
      .map((m) => JSON.parse(m))
    update((messages) => [...messages, ...serverMessages])
  }

  const refresh = async () => {
    await getMessages()
    await sendMessages()
  }

  return {
    subscribe,
    send: async (message: Message) => {
      const response = await fetch("/messages", {
        method: "POST",
        body: new URLSearchParams(message.toJSON()),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
      })
      update((messages) => [...messages, message.withSentStatus(response.ok)])
    },

    init: async () => {
      set([])
      return await getMessages()
    },

    poll: () => setInterval(refresh, 1000),
    refresh,
  }
}
