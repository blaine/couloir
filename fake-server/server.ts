import express from "express"
import path from "path"
import bodyParser from "body-parser"
import { promises as fs } from "fs"
import crypto from "crypto"

const app = express()
const port = 3000

// Serve static files from the 'data' directory
app.use(express.static(path.join(__dirname, "app")))
app.use(bodyParser.urlencoded())

app.get("/messages-list", async (req, res) => {
  let entries = await fs.readdir("data")
  let sorted = entries
    .sort((a, b) => {
      return b.localeCompare(a)
    })
    .join("\n")
  console.log(sorted)
  res.send(sorted)
})

app.get("/messages", (req, res) => {})

app.post("/messages", async (req, res) => {
  let message = JSON.stringify(req.body)
  let hash = crypto.createHash("sha256").update(message).digest("hex")
  await fs.writeFile(`data/${hash}`, JSON.stringify(req.body))
  res.redirect("/")
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
