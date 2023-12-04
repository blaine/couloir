import express from "express"
import path from "path"
import { promises as fs } from "fs"

const app = express()

fs.stat("data").catch(() => {
  fs.mkdir("data")
})

app.use(express.static(path.join(__dirname, "..", "app")))
app.use(express.text())

app.delete("/docs", async (_, res) => {
  const ids = await fs.readdir("data")
  await Promise.all(ids.map((id) => fs.unlink(`data/${id}`)))
  res.end()
})

/**
 * GET /ids
 * Returns a sorted list of message ids.
 */
app.get("/ids", async (req, res) => {
  let entries = await fs.readdir("data")
  let sorted = entries
    .sort((a, b) => {
      return b.localeCompare(a)
    })
    .join("\n")
  res.send(sorted)
})

/**
 * GET /docs
 * Returns the requested messages.
 *
 * @header {string} if-match - The current length of the ids list. If this
 *                             doesn't match the current ids list, a 412
 *                             will be returned.
 *
 * @param {string} q - The range of docs to retrieve. Multiple ranges can be
 *                     specified by separating them with commas. Each range
 *                     should be in the format "start-end", where "start" and
 *                     "end" are the indices of the messages to retrieve.
 *                     If "end" is not specified, all messages from "start" to
 *                     the end will be retrieved.
 *
 * @example
 * // Example usage: /docs?q=0-2,4-6
 * // This will retrieve messages with indices 0, 1, 2, 4, 5, and 6.
 *
 * @returns {void}
 */
app.get("/docs", async (req, res) => {
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
    res
      .status(412)
      .send(
        "It looks like your messages-list is out of date. Pass the 'if-match' header with the current messages-list count"
      )
    return
  }

  // Otherwise, we can send the messages
  let qs = q.split(",")
  for (let i = 0; i < qs.length; i++) {
    let range = qs[i]
    const [s, e] = range.split("-")
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

    for (let i = start; i <= end; i++) {
      let id = entries[i]
      let data = await fs.readFile(`data/${id}`)
      res.write(data)
      res.write("\n")
    }
  }
  res.end()
})

app.post("/docs/:id", async (req, res) => {
  await fs.writeFile(`data/${req.params.id}`, req.body)
  res.end()
})

export default app
