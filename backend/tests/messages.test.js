import test from "node:test";
import assert from "node:assert/strict";
import { MessageService } from "../src/modules/messages/message.service.js";

test("rejects sending message with empty content", async () => {
  await assert.rejects(
    async () => {
      await MessageService.sendMessage({
        conversationId: "test-conv-id",
        senderId: "test-sender-id",
        content: "   ",
      });
    },
    {
      message: "Message content cannot be empty.",
    }
  );
});

test("rejects starting a conversation without recipient", async () => {
  await assert.rejects(
    async () => {
      await MessageService.getOrCreateConversation("user-1", "");
    },
    {
      message: "Both user IDs or a valid recipient are required to establish a conversation.",
    }
  );
});

test("rejects starting a conversation with oneself", async () => {
  await assert.rejects(
    async () => {
      await MessageService.getOrCreateConversation("user-1", "user-1");
    },
    {
      message: "Cannot start a conversation with yourself.",
    }
  );
});
