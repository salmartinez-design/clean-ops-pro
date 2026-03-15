import { Router } from "express";
import { db } from "@workspace/db";
import { messagesTable, usersTable } from "@workspace/db/schema";
import { eq, and, or, desc, isNull, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const { channel = "general", limit = "50" } = req.query as any;
    const companyId = req.auth!.companyId!;

    let msgs;
    if (channel.startsWith("dm:")) {
      const otherId = parseInt(channel.replace("dm:", ""));
      msgs = await db
        .select({
          id: messagesTable.id,
          sender_id: messagesTable.sender_id,
          recipient_id: messagesTable.recipient_id,
          channel: messagesTable.channel,
          body: messagesTable.body,
          read_at: messagesTable.read_at,
          created_at: messagesTable.created_at,
          sender_name: sql<string>`concat(${usersTable.first_name},' ',${usersTable.last_name})`,
          sender_avatar: usersTable.avatar_url,
          sender_initials: sql<string>`upper(left(${usersTable.first_name},1)||left(${usersTable.last_name},1))`,
        })
        .from(messagesTable)
        .leftJoin(usersTable, eq(messagesTable.sender_id, usersTable.id))
        .where(and(
          eq(messagesTable.company_id, companyId),
          or(
            and(eq(messagesTable.sender_id, req.auth!.userId), eq(messagesTable.recipient_id, otherId)),
            and(eq(messagesTable.sender_id, otherId), eq(messagesTable.recipient_id, req.auth!.userId)),
          )
        ))
        .orderBy(desc(messagesTable.created_at))
        .limit(parseInt(limit));
    } else {
      msgs = await db
        .select({
          id: messagesTable.id,
          sender_id: messagesTable.sender_id,
          recipient_id: messagesTable.recipient_id,
          channel: messagesTable.channel,
          body: messagesTable.body,
          read_at: messagesTable.read_at,
          created_at: messagesTable.created_at,
          sender_name: sql<string>`concat(${usersTable.first_name},' ',${usersTable.last_name})`,
          sender_avatar: usersTable.avatar_url,
          sender_initials: sql<string>`upper(left(${usersTable.first_name},1)||left(${usersTable.last_name},1))`,
        })
        .from(messagesTable)
        .leftJoin(usersTable, eq(messagesTable.sender_id, usersTable.id))
        .where(and(
          eq(messagesTable.company_id, companyId),
          eq(messagesTable.channel, channel),
          isNull(messagesTable.recipient_id),
        ))
        .orderBy(desc(messagesTable.created_at))
        .limit(parseInt(limit));
    }

    return res.json({ messages: msgs.reverse() });
  } catch (err) {
    console.error("Messages error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { channel = "general", body, recipient_id } = req.body;
    if (!body?.trim()) return res.status(400).json({ error: "body required" });

    const [msg] = await db.insert(messagesTable).values({
      company_id: req.auth!.companyId!,
      sender_id: req.auth!.userId,
      recipient_id: recipient_id || null,
      channel: recipient_id ? `dm:${recipient_id}` : channel,
      body: body.trim(),
    }).returning();

    return res.json(msg);
  } catch (err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/unread", requireAuth, async (req, res) => {
  try {
    const companyId = req.auth!.companyId!;
    const count = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(messagesTable)
      .where(and(
        eq(messagesTable.company_id, companyId),
        isNull(messagesTable.read_at),
        sql`${messagesTable.sender_id} != ${req.auth!.userId}`,
      ));
    return res.json({ unread: count[0]?.count || 0 });
  } catch {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/team", requireAuth, async (req, res) => {
  try {
    const companyId = req.auth!.companyId!;
    const users = await db
      .select({ id: usersTable.id, first_name: usersTable.first_name, last_name: usersTable.last_name, role: usersTable.role, avatar_url: usersTable.avatar_url })
      .from(usersTable)
      .where(and(eq(usersTable.company_id, companyId), eq(usersTable.is_active, true)));
    return res.json({ team: users.filter(u => u.id !== req.auth!.userId) });
  } catch {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/:id/read", requireAuth, async (req, res) => {
  try {
    await db.update(messagesTable).set({ read_at: new Date() }).where(eq(messagesTable.id, parseInt(req.params.id)));
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
