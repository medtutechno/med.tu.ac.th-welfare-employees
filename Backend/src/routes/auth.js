import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import db from "../db.js";
import { authenticateToken } from "../middleware/auth.js";
import axios from "axios";

dotenv.config();

const router = express.Router();

/**
 * POST /auth/login
 *
 * Authenticate a user by username and password. If successful, return a
 * signed JWT along with the basic user information (id, username, role).
 */
router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ message: "missing credentials" });
  }
  try {
    const [rows] = await db.query(
      "SELECT id, username, password, role FROM users WHERE username = ?",
      [username]
    );
    // If a local user exists, verify the password; otherwise attempt external login
    if (rows.length > 0) {
      const user = rows[0];
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        const payload = {
          id: user.id,
          username: user.username,
          role: user.role,
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, {
          expiresIn: process.env.JWT_EXPIRES_IN || "1h",
        });
        return res.json({ user: payload, token });
      }
      // fall through to external authentication if password does not match
    }
    // External login for general users (and potential staff). On success,
    // the user may act as a general user and, if there is a corresponding
    // record in the local users table (e.g. username = employee_code), as
    // a staff member. The response payload will include a `roles` array
    // representing all roles the user can assume and the list of welfare
    // types they manage (assignments) if applicable.
    try {
      const apiKey = process.env.EMP_API_KEY;
      if (!apiKey) {
        throw new Error("missing external API key");
      }
      const resp = await axios.post(
        "https://med.tu.ac.th/emp_api/api/employee/login",
        { username, password },
        {
          // Use the header name "Application-Key" instead of the previous
          // lowercase form. External services are case-sensitive to this key.
          headers: { "Application-Key": apiKey },
          timeout: 10000,
        }
      );
      const result = resp.data;
      console.log(result);
      if (!result || result.status === false) {
        return res.status(401).json({ message: "invalid credentials" });
      }
      const data = result.user || {};
      const employeeCode = data.MEDCODE;
      // Base payload for general user
      const payload = {
        id: null,
        username,
        fname: data.fname,
        lname: data.lname,
        role: "user",
        employee_code: data.username,
        roles: ["user"],
      };
      try {
        // Look up if this employee has a local staff account. We use the
        // employee code as the username for staff accounts.
        // const [[staffRow]] = await db.query(
        //   "SELECT id, role FROM users WHERE username = ?",
        //   [employeeCode]
        // );
        // if (staffRow && staffRow.role) {
        //   // If the local role is staff or superadmin, augment the payload
        //   // with that role. We also fetch the welfare types they manage.
        //   payload.id = staffRow.id;
        //   payload.roles = Array.from(new Set([payload.role, staffRow.role]));
        //   // Fetch assignments for this user id
        //   const [assignRows] = await db.query(
        //     "SELECT welfare_type_id FROM staff_welfare_permission WHERE user_id = ?",
        //     [staffRow.id]
        //   );
        //   payload.staffAssignments = assignRows.map((r) => r.welfare_type_id);
        // }

        const [assignRows] = await db.query(
          "SELECT welfare_type_id FROM staff_welfare_permission WHERE user_id = ?",
          [username]
        );
        payload.staffAssignments = assignRows.map((r) => r.welfare_type_id);
      } catch (dbErr) {
        console.error("staff lookup error:", dbErr);
      }
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "1h",
      });
      return res.json({ user: payload, token });
    } catch (extErr) {
      console.error(
        "external login error:",
        extErr.response?.data || extErr.message
      );
      return res.status(401).json({ message: "invalid credentials" });
    }
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
});

/**
 * GET /auth/me
 *
 * Return the current authenticated user based on the provided JWT. If the
 * token is invalid or missing, a 401 response is returned.
 */
router.get("/me", authenticateToken, (req, res) => {
  return res.json({ user: req.user });
});

/**
 * POST /auth/logout
 *
 * JWTs are stateless, so logging out on the server has no effect other than
 * instructing the client to delete its token. This endpoint simply
 * returns a success response to satisfy the front‑end API.
 */
router.post("/logout", (req, res) => {
  return res.json({ ok: true });
});

export default router;
