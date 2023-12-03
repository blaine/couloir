import supertest from "supertest"
import app from "./app"
import { assertThat, equalTo } from "hamjest"

const request = supertest(app)

describe("messages server", () => {
  describe("contract", () => {
    // contract tests describe the behaviour of the server
    // as a "black box". They only use public-facing behaviour,
    // and could be run against other implementations of the server.
    describe("POST /reset", () => {
      it("responds 200 OK", async () => {
        await request.post("/reset").expect(200)
      })
    })

    describe("POST /messages", () => {
      it("responds 302 redirect", async () => {
        // Why 302?
        await request
          .post("/messages")
          .send({ message: "hello" })
          .expect(302)
          .expect("Location", "/")
      })
    })

    describe("GET /messages-list", () => {
      it("responds 200 OK", async () =>
        await request.get("/messages-list").expect(200))
      context("when there are no messages", () => {
        before(async () => await request.post("/reset"))
        it("responds with an empty list as text", async () => {
          const response = await request.get("/messages-list")
          assertThat(response.text, equalTo(""))
        })
      })

      context("when a few messages have been posted", () => {
        before(async () => {
          await request.post("/reset").expect(200)
          await request
            .post("/messages")
            .send(JSON.stringify({ message: "hello" }))
          await request
            .post("/messages")
            .send(JSON.stringify({ message: "world" }))
        })
        it("responds with a newline-separated list of the message IDs as text", async () => {
          const response = await request.get("/messages-list")
          assertThat(
            response.text.split("\n"),
            equalTo([
              "ab60a0eb1e73a245e58c6a9b9ad0dd811d6f1f8b4cc9d2f84a8c9d4535e5a4f0",
              "5241e5849c0fc5e4b6fdc544b957b4aade04774f918e77e3895d70da15cc758d",
            ])
          )
        })
      })
    })

    describe("GET /messages", () => {
      describe("guarding against invalid queries", () => {
        context("with no query", () => {
          it("responds 400 Bad Request", async () =>
            await request.get("/messages").expect(400))
        })
        context("with an invalid query", () => {
          it("responds 400 Bad Request", async () =>
            await request.get("/messages?q=").expect(400))
        })
      })
      describe("checking the ETag", () => {
        context("with no if-match header", () => {
          it("responds 412 Precondition Failed", async () => {
            await request.get("/messages?q=0-0").expect(412)
          })
        })

        context(
          "with an if-match header that doesn't match the current message count",
          () => {
            it("responds 412 Precondition Failed", async () => {
              const actualMessageCount = (
                await request.get("/messages-list")
              ).text.split("\n").length
              const invalidEtag = actualMessageCount + 1
              await request
                .get("/messages?q=0-0")
                .set("if-match", String(invalidEtag))
                .expect(412)
            })
          }
        )
        context("with no if-match header", () => {
          it("responds 412 Precondition Failed", async () => {
            await request.get("/messages?q=0-0").expect(412)
          })
        })
      })
    })
  })
})
