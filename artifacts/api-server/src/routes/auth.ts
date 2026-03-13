import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, companiesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireAuth, signToken } from "../lib/auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Bad Request", message: "Email and password required" });
    }

    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);

    if (!user[0]) {
      return res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    }

    if (!user[0].is_active) {
      return res.status(401).json({ error: "Unauthorized", message: "Account is inactive" });
    }

    const token = signToken({
      userId: user[0].id,
      companyId: user[0].company_id,
      role: user[0].role,
      email: user[0].email,
    });

    return res.json({
      token,
      user: {
        id: user[0].id,
        email: user[0].email,
        first_name: user[0].first_name,
        last_name: user[0].last_name,
        role: user[0].role,
        company_id: user[0].company_id,
        avatar_url: user[0].avatar_url,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Login failed" });
  }
});

router.post("/logout", requireAuth, (_req, res) => {
  res.json({ success: true, message: "Logged out" });
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.auth!.userId))
      .limit(1);

    if (!user[0]) {
      return res.status(404).json({ error: "Not Found", message: "User not found" });
    }

    return res.json({
      id: user[0].id,
      email: user[0].email,
      first_name: user[0].first_name,
      last_name: user[0].last_name,
      role: user[0].role,
      company_id: user[0].company_id,
      avatar_url: user[0].avatar_url,
    });
  } catch (err) {
    console.error("Get me error:", err);
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to get user" });
  }
});

export default router;
