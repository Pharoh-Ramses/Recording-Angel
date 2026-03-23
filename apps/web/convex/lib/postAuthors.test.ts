import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { resolvePostAuthor } from "./postAuthors";

type TestRecord = {
  _id: string;
  userId?: string;
  name?: string;
  imageUrl?: string;
};

describe("resolvePostAuthor", () => {
  test("resolves member-authored posts through members to users", async () => {
    const records = new Map<string, TestRecord>([
      ["member-1", { _id: "member-1", userId: "user-1" }],
      [
        "user-1",
        {
          _id: "user-1",
          name: "Alice Member",
          imageUrl: "https://example.com/alice.png",
        },
      ],
    ])

    const author = await resolvePostAuthor(
      {
        db: {
          get(id: string) {
            return Promise.resolve(records.get(id) ?? null);
          },
        },
      },
      {
        authorType: "member",
        authorMemberId: "member-1",
      },
    );

    assert.deepEqual(author, {
      kind: "member",
      name: "Alice Member",
      imageUrl: "https://example.com/alice.png",
    });
  });

  test("resolves missionary-authored posts through missionaries to users", async () => {
    const records = new Map<string, TestRecord>([
      ["missionary-1", { _id: "missionary-1", userId: "user-2", name: "Elder Old" }],
      [
        "user-2",
        {
          _id: "user-2",
          name: "Elder New",
          imageUrl: "https://example.com/elder.png",
        },
      ],
    ])

    const author = await resolvePostAuthor(
      {
        db: {
          get(id: string) {
            return Promise.resolve(records.get(id) ?? null);
          },
        },
      },
      {
        authorType: "missionary",
        authorMissionaryId: "missionary-1",
      },
    );

    assert.deepEqual(author, {
      kind: "missionary",
      name: "Elder New",
      imageUrl: "https://example.com/elder.png",
    });
  });
});
