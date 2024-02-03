import supertest from "supertest"
import app from "./app"
import {
  assertThat,
  containsInAnyOrder,
  equalTo,
  matchesPattern,
} from "hamjest"

for (const type of ["fake", "real"]) {
  if (type == "real" && !process.env.TEST_REAL_SERVER) {
    continue
  }

  describe(`${type} messages server`, () => {
    let request: supertest.SuperTest<supertest.Test>
    before(async () => {
      request =
        type === "fake"
          ? supertest(await app("tmp/data"))
          : supertest("http://192.168.1.80")
    })
    // contract tests describe the behaviour of the server
    // as a "black box". They only use public-facing behaviour,
    // and could be run against other implementations of the server.
    describe("contract", () => {
      const postMessage = async (message: string) => {
        await request.post("/messages").type("form").send({ message })
      }

      const reset = async () => {
        await request.delete("/messages")
      }
      describe("DELETE /messages", () => {
        it("responds 200 OK", async () => {
          await request.delete("/messages").expect(200)
        })
      })

      describe("POST /messages", () => {
        it("responds 200 OK", async () => {
          await request
            .post("/messages")
            .type("form")
            .send({ message: "hello" })
            .expect(200)
        })
      })

      describe("GET /messages-list", () => {
        it("responds 200 OK", async () =>
          await request.get("/messages-list").expect(200))
        context("when there are no messages", () => {
          before(reset)
          it("responds with an empty list as text", async () => {
            const response = await request.get("/messages-list")
            assertThat(response.text, equalTo(""))
          })
        })

        context("when a few messages have been posted", () => {
          before(
            async () =>
              await Promise.all([
                reset(),
                postMessage("hello"),
                postMessage("world"),
              ])
          )
          it("responds with a newline-separated list of the message IDs as text", async () => {
            const response = await request.get("/messages-list")
            assertThat(
              response.text.split("\n"),
              equalTo([
                "3a477a27451b71eaf6dc49c80b0e2e4c80f3fc5060884497c4246ea2b44d0790",
                "9b2d43affbf49a367028df2e1414f84c0e099ac98c3d54a8a80157fd7771af25",
              ])
            )
          })
        })
      })

      describe("GET /messages", () => {
        describe("guarding against invalid queries", () => {
          context("no query", () => {
            it("responds 400 Bad Request", async () =>
              await request.get("/messages").expect(400))
          })
          context("an empty query", () => {
            it("responds 400 Bad Request", async () => {
              const response = await request.get("/messages?q=").expect(400)
              assertThat(response.text, equalTo("Invalid query"))
            })
          })

          context("a badly-formed query range", () => {
            beforeEach(() =>
              Promise.all([
                postMessage("hello"),
                postMessage("world"),
                postMessage("yo"),
              ])
            )

            for (const query of ["x-1", "2-1", "0-x", "1-0", "poop"]) {
              it(`responds 400 Bad Request for ?q=${query}`, async () => {
                const response = await request
                  .get(`/messages?q=${query}`)
                  .set("if-match", String(3))
                  .expect(400)
                assertThat(response.text, matchesPattern("Invalid range"))
              })
            }
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

          context("with a valid if-match header", () => {
            // TODO: tests for bad ranges
            it("responds 400 for a bad range")
            it("responsds with the messages specified by the range", async () => {
              await reset()
              await Promise.all([
                postMessage("one"),
                postMessage("two"),
                postMessage("three"),
                postMessage("four"),
                postMessage("five"),
                postMessage("six"),
              ])
              const response = await request
                .get("/messages?q=0-2,4-5")
                .set("if-match", "6")
                .expect(200)
              const messages = response.text
                .trim()
                .split("\n")
                .map((raw) => JSON.parse(raw).message)
              assertThat(
                messages,
                containsInAnyOrder("one", "two", "four", "five", "six")
              )
            })
          })
        })
      })
    })
  })
}
