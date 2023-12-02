import express from "express"
import path from "path"
import { promises as fs } from "fs"
import crypto from "crypto"

const app = express()

// Serve static files from the 'data' directory
app.use(express.static(path.join(__dirname, "app")))
app.use(express.urlencoded({ extended: true }))

app.get("/messages-list", async (req, res) => {
  let entries = await fs.readdir("data")
  let sorted = entries
    .sort((a, b) => {
      return b.localeCompare(a)
    })
    .join("\n")
  res.send(sorted)
})

app.post("/messages", async (req, res) => {
  let message = JSON.stringify(req.body)
  let hash = crypto.createHash("sha256").update(message).digest("hex")
  await fs.writeFile(`data/${hash}`, JSON.stringify(req.body))
  res.redirect("/")
})

export default app
