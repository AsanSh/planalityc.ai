import { Router } from "express";
import { eq, and, desc, or } from "drizzle-orm";
import { db, notificationsTable, messagesTable, usersTable } from "../lib/db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { requireTenantCompany } from "../middleware/tenant";

// Единый роутер уведомлений и чата (объединены бывшие notifications.ts + notifications-api.ts).
const router: ReturnType<typeof Router> = Router();

router.use(requireAuth, requireTenantCompany);

// ── NOTIFICATIONS ──────────────────────────────────────────────────────────

router.get("/notifications", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { limit = "50", unreadOnly } = req.query;

  let conditions = and(
    eq(notificationsTable.companyId, req.scopedCompanyId!),
    or(
      eq(notificationsTable.userId, req.userId!),
      eq(notificationsTable.userId, null as any) // общекорпоративные уведомления
    )
  );

  if (unreadOnly === "true") {
    conditions = and(conditions, eq(notificationsTable.isRead, false));
  }

  const notifications = await db.select()
    .from(notificationsTable)
    .where(conditions)
    .orderBy(desc(notificationsTable.createdAt))
    .limit(parseInt(limit as string) || 50);

  res.json(notifications);
});

router.get("/notifications/unread-count", async (req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await db.select({ id: notificationsTable.id })
    .from(notificationsTable)
    .where(and(
      eq(notificationsTable.companyId, req.scopedCompanyId!),
      or(
        eq(notificationsTable.userId, req.userId!),
        eq(notificationsTable.userId, null as any)
      ),
      eq(notificationsTable.isRead, false)
    ));
  res.json({ count: rows.length });
});

router.post("/notifications", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { userId, type, title, body, message, icon, color, link, metadata, fromUserId } = req.body;
  if (!title) { res.status(400).json({ error: "title required" }); return; }

  const [row] = await db.insert(notificationsTable).values({
    companyId: req.scopedCompanyId!,
    userId: userId || null,
    fromUserId: fromUserId || null,
    type: type || "info",
    title,
    body: body || message || null,
    message: message || body || null,
    icon: icon || "info",
    color: color || "blue",
    link: link || null,
    metadata: metadata ? JSON.stringify(metadata) : null,
    isRead: false,
    read: false,
  }).returning();

  res.status(201).json(row);
});

router.patch("/notifications/:id/read", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [row] = await db.update(notificationsTable)
    .set({ isRead: true, read: true })
    .where(and(
      eq(notificationsTable.id, id),
      eq(notificationsTable.companyId, req.scopedCompanyId!)
    ))
    .returning();
  if (!row) { res.status(404).json({ error: "Notification not found" }); return; }
  res.json(row);
});

async function markAllRead(req: AuthenticatedRequest): Promise<void> {
  await db.update(notificationsTable)
    .set({ isRead: true, read: true })
    .where(and(
      eq(notificationsTable.companyId, req.scopedCompanyId!),
      or(
        eq(notificationsTable.userId, req.userId!),
        eq(notificationsTable.userId, null as any)
      ),
      eq(notificationsTable.isRead, false)
    ));
}

// Два алиаса одного действия — их используют разные части фронтенда.
router.patch("/notifications/mark-all-read", async (req: AuthenticatedRequest, res): Promise<void> => {
  await markAllRead(req);
  res.json({ ok: true });
});

router.post("/notifications/read-all", async (req: AuthenticatedRequest, res): Promise<void> => {
  await markAllRead(req);
  res.json({ ok: true });
});

router.delete("/notifications/:id", async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.delete(notificationsTable)
    .where(and(
      eq(notificationsTable.id, id),
      eq(notificationsTable.companyId, req.scopedCompanyId!)
    ));
  res.json({ ok: true });
});

// ── MESSAGES / CHAT ────────────────────────────────────────────────────────

router.get("/messages/conversations", async (req: AuthenticatedRequest, res): Promise<void> => {
  const myId = req.userId!;
  const companyId = req.scopedCompanyId!;

  const sent = await db.select().from(messagesTable)
    .where(and(eq(messagesTable.fromUserId, myId), eq(messagesTable.companyId, companyId)));
  const received = await db.select().from(messagesTable)
    .where(and(eq(messagesTable.toUserId, myId), eq(messagesTable.companyId, companyId)));

  const all = [...sent, ...received];

  // partner userId → последнее сообщение
  const convMap: Record<number, any> = {};
  all.forEach(m => {
    const partnerId = m.fromUserId === myId ? (m.toUserId ?? 0) : m.fromUserId;
    if (!convMap[partnerId] || new Date(m.createdAt) > new Date(convMap[partnerId].createdAt)) {
      convMap[partnerId] = m;
    }
  });

  const partners = Object.keys(convMap).map(Number).filter(id => id > 0);
  if (partners.length === 0) { res.json([]); return; }

  const partnerUsers = await db.select({
    id: usersTable.id,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    email: usersTable.email,
  }).from(usersTable).where(eq(usersTable.companyId, companyId));

  const userMap: Record<number, any> = {};
  partnerUsers.forEach(u => { userMap[u.id] = u; });

  const conversations = partners.map(partnerId => {
    const lastMsg = convMap[partnerId];
    const unreadCount = received.filter(m => m.fromUserId === partnerId && !m.isRead).length;
    return {
      partnerId,
      partner: userMap[partnerId] || { id: partnerId, firstName: "Пользователь", lastName: "", email: "" },
      lastMessage: lastMsg,
      unreadCount,
    };
  }).sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());

  res.json(conversations);
});

// Важно: объявлен ДО "/messages/:partnerId", иначе "unread-count" матчится как partnerId.
router.get("/messages/unread-count", async (req: AuthenticatedRequest, res): Promise<void> => {
  const rows = await db.select({ id: messagesTable.id }).from(messagesTable)
    .where(
      and(
        eq(messagesTable.toUserId, req.userId!),
        eq(messagesTable.companyId, req.scopedCompanyId!),
        eq(messagesTable.isRead, false)
      )
    );
  res.json({ count: rows.length });
});

router.get("/messages/:partnerId", async (req: AuthenticatedRequest, res): Promise<void> => {
  const myId = req.userId!;
  const companyId = req.scopedCompanyId!;
  const partnerId = parseInt(req.params.partnerId as string, 10);
  if (!Number.isFinite(partnerId)) { res.status(400).json({ error: "Invalid partnerId" }); return; }

  const msgs = await db.select().from(messagesTable)
    .where(
      and(
        eq(messagesTable.companyId, companyId),
        or(
          and(eq(messagesTable.fromUserId, myId), eq(messagesTable.toUserId, partnerId)),
          and(eq(messagesTable.fromUserId, partnerId), eq(messagesTable.toUserId, myId))
        )
      )
    )
    .orderBy(messagesTable.createdAt);

  // Полученные сообщения помечаем прочитанными
  await db.update(messagesTable)
    .set({ isRead: true })
    .where(
      and(
        eq(messagesTable.fromUserId, partnerId),
        eq(messagesTable.toUserId, myId),
        eq(messagesTable.companyId, companyId)
      )
    );

  res.json(msgs);
});

router.post("/messages", async (req: AuthenticatedRequest, res): Promise<void> => {
  const { toUserId, content, attachment } = req.body;
  const text = typeof content === "string" ? content.trim() : "";
  const hasAttachment =
    attachment &&
    typeof attachment.fileName === "string" &&
    typeof attachment.dataBase64 === "string" &&
    typeof attachment.mimeType === "string";
  if (!toUserId || (!text && !hasAttachment)) {
    res.status(400).json({ error: "toUserId and content or attachment required" });
    return;
  }
  const dataBase64 = hasAttachment ? String(attachment.dataBase64) : null;
  if (dataBase64 && dataBase64.length > 8_000_000) {
    res.status(413).json({ error: "Файл слишком большой. Максимум около 6 МБ." });
    return;
  }
  const [row] = await db.insert(messagesTable).values({
    companyId: req.scopedCompanyId!,
    fromUserId: req.userId!,
    toUserId,
    content: text,
    attachmentName: hasAttachment ? String(attachment.fileName).slice(0, 240) : null,
    attachmentMime: hasAttachment ? String(attachment.mimeType).slice(0, 120) : null,
    attachmentData: dataBase64,
    attachmentSize: hasAttachment && typeof attachment.size === "number" ? attachment.size : null,
  }).returning();
  res.status(201).json(row);
});

export default router;
