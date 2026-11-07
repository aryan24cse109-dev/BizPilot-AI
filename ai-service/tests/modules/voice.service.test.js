import test from "node:test";
import assert from "node:assert/strict";
import { transcribeAudio } from "../../src/modules/voice/voice.service.js";

test("transcribeAudio throws 400 for unsupported audio format", async () => {
  await assert.rejects(
    () => transcribeAudio({ audio: "plain-text-not-data-uri" }),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.equal(err.code, "AUDIO_INVALID");
      return true;
    }
  );
});

test("transcribeAudio throws 413 for empty audio base64 payload", async () => {
  await assert.rejects(
    () => transcribeAudio({ audio: "data:audio/webm;base64," }),
    (err) => {
      assert.equal(err.statusCode, 400);
      return true;
    }
  );
});

test("transcribeAudio successfully calls provider and parses transcript", async () => {
  const dummyBase64 = Buffer.from("dummy-audio-bytes").toString("base64");
  const dummyDataUri = `data:audio/webm;base64,${dummyBase64}`;

  const mockFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ transcript: "create an invoice for Rahul", language_code: "en-IN" }),
  });

  const res = await transcribeAudio({
    audio: dummyDataUri,
    language: "en-IN",
    fetchImpl: mockFetch,
  });

  assert.equal(res.transcript, "create an invoice for Rahul");
  assert.equal(res.languageCode, "en-IN");
  assert.ok(res.requestId);
});
