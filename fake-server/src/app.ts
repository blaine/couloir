import express from "express"
import path from "path"
import { promises as fs } from "fs"
import crypto from "crypto"

const app = express()

fs.stat("data").catch(() => {
  fs.mkdir("data")
})

app.use(express.static(path.join(__dirname, "..", "app")))
app.use(express.urlencoded())

app.post("/reset", async (_, res) => {
  const entries = await fs.readdir("data")
  await Promise.all(entries.map((entry) => fs.unlink(`data/${entry}`)))
  res.end()
})

/**
 * GET /messages-list
 * Returns a sorted list of message ids.
 */
app.get("/messages-list", async (req, res) => {
  let entries = await fs.readdir("data")
  let sorted = entries
    .sort((a, b) => {
      return b.localeCompare(a)
    })
    .join("\n")
  res.send(sorted)
})

/**
 * GET /messages
 * Returns the requested messages.
 *
 * @header {string} if-match - The current length of the messages-list. If this
 *                             doesn't match the current messages-list, a 412
 *                             will be returned.
 *
 * @param {string} q - The range of messages to retrieve. Multiple ranges can be
 *                     specified by separating them with commas. Each range
 *                     should be in the format "start-end", where "start" and
 *                     "end" are the indices of the messages to retrieve.
 *                     If "end" is not specified, all messages from "start" to
 *                     the end will be retrieved.
 *
 * @example
 * // Example usage: /messages?q=0-2,4-6
 * // This will retrieve messages with indices 0, 1, 2, 4, 5, and 6.
 *
 * @returns {void}
 */
app.get("/messages", async (req, res) => {
  let q = req.query.q
  if (!q || typeof q !== "string") {
    res.status(400).send("Invalid query")
    return
  }

  let etag = req.headers["if-match"]
  let entries = await fs.readdir("data")

  // If the client is requesting messages but the messages-list they're
  // requesting against doesn't match our current, return a 412, at which point
  // the client can try again with the new messages-list
  if (!etag || parseInt(etag) !== entries.length) {
    res.status(412).send("Messages-list out of date")
    return
  }

  // Otherwise, we can send the messages
  let qs = q.split(",")
  for (let i = 0; i < qs.length; i++) {
    let range = qs[i]
    let [s, e] = range.split("-")
    let start = parseInt(s)
    let end = parseInt(e)
    if (
      isNaN(start) ||
      start < 0 ||
      start > entries.length ||
      isNaN(end) ||
      end < start ||
      end > entries.length
    ) {
      return res.status(400).send("Invalid range")
    }

    console.log(`Sending messages ${start}-${end}`)
    for (let i = start; i <= end; i++) {
      let hash = entries[i]
      let data = await fs.readFile(`data/${hash}`)
      console.log(hash, data)
      res.write(data)
      res.write("\n")
    }
  }

  console.log("Done sending messages")
  res.end()
})

app.post("/messages", async (req, res) => {
  // we do the stringification server-side to ensure that the client can't send
  // a malformed message
  let message = JSON.stringify(req.body)
  let hash = crypto.createHash("sha256").update(message).digest("hex")
  await fs.writeFile(`data/${hash}`, JSON.stringify(req.body))
  res.redirect("/")
})

export default app
