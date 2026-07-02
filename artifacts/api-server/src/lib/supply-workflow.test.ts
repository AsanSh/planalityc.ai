import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nextRequestStatus,
  type RequestStatus,
  type RequestEvent,
} from "./supply-workflow";

test("submit: draft → pending_approval", () => {
  assert.equal(nextRequestStatus("draft", { type: "submit" }), "pending_approval");
});

test("approve: pending_approval → approved", () => {
  assert.equal(nextRequestStatus("pending_approval", { type: "approve" }), "approved");
});

test("reject: pending_approval → rejected", () => {
  assert.equal(nextRequestStatus("pending_approval", { type: "reject" }), "rejected");
});

test("plan: approved → planned", () => {
  assert.equal(nextRequestStatus("approved", { type: "plan" }), "planned");
});

test("order: planned → ordered", () => {
  assert.equal(nextRequestStatus("planned", { type: "order" }), "ordered");
});

test("close: ordered → closed", () => {
  assert.equal(nextRequestStatus("ordered", { type: "close" }), "closed");
});

test("cancel допустим из draft/pending_approval/approved/planned", () => {
  const froms: RequestStatus[] = ["draft", "pending_approval", "approved", "planned"];
  for (const s of froms) {
    assert.equal(nextRequestStatus(s, { type: "cancel" }), "cancelled");
  }
});

test("недопустимый переход бросает", () => {
  assert.throws(() => nextRequestStatus("approved", { type: "approve" } as RequestEvent));
  assert.throws(() => nextRequestStatus("ordered", { type: "cancel" }));
});
