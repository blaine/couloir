import express from "express"
import path from "path"
import { promises as fs } from "fs"
import crypto from "crypto"
import createDebug from "debug"

const debug = createDebug("couloir:fake-server")

export default async (dataPath: string) => {
  const app = express()

  await fs.stat(dataPath).catch(() => fs.mkdir(dataPath, { recursive: true }))

  app.use(express.static(path.join(__dirname, "..", "..", "client", "dist")))
  app.use(express.urlencoded({ extended: false }))

  app.delete("/messages", async (_, res) => {
    const entries = await fs.readdir(dataPath)
    await Promise.all(entries.map((entry) => fs.unlink(`${dataPath}/${entry}`)))
    res.end()
  })

  /**
   * GET /messages-list
   * Returns a sorted list of message ids.
   */
  app.get("/messages-list", async (req, res) => {
    let entries = await fs.readdir(dataPath)
    let sorted = entries
      .sort((a, b) => {
        return a.localeCompare(b)
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
    let entries = await fs.readdir(dataPath)

    // If the client is requesting messages but the messages-list they're
    // requesting against doesn't match our current, return a 412, at which point
    // the client can try again with the new messages-list
    if (!etag || parseInt(etag) !== entries.length) {
      res
        .status(412)
        .send(
          `It looks like your messages-list is out of date. Pass the 'if-match' header with the current messages-list count (got ${etag}, expected ${entries.length})`
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
        start > entries.length ||
        isNaN(end) ||
        end < start ||
        end > entries.length
      ) {
        return res.status(400).send(`Invalid range. Got ${qs}.`)
      }

      debug(`Sending messages ${start}-${end}`)
      for (let i = start; i <= end; i++) {
        let hash = entries[i]
        let data = await fs.readFile(`${dataPath}/${hash}`)
        debug(hash, data.toString())
        res.write(data)
        res.write("\n")
      }
    }

    debug("Done sending messages")
    res.end()
  })

  app.post("/messages", async (req, res) => {
    // we do the stringification server-side to ensure that the client can't send
    // a malformed message
    let message = JSON.stringify(req.body)
    let hash = crypto.createHash("sha256").update(message).digest("hex")
    await fs.writeFile(`${dataPath}/${hash}`, JSON.stringify(req.body))
    res.sendStatus(200)
  })

  return app
}
