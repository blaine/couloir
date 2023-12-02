import supertest from "supertest"
import app from "./app"

const request = supertest(app)

describe("app", () => {
  describe("GET /messages-list", () => {
    it("works", async () => {
      await request.get("/messages-list").expect(200)
    })
  })

  describe("POST /messages", () => {
    it("works", async () => {
      await request.post("/messages").send({ message: "hello" }).expect(302)
    })
  })
})
