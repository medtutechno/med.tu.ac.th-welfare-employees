import express from "express";
import db from "../db.js";
import axios from "axios";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /balances?employeeCode=BET0047
 *
 * Return the remaining balances for each welfare type for the given employee
 * code. The query sums the total transactions for each welfare type and
 * subtracts this from the employee's allocated balance in employee_welfare_balances.
 */
router.get("/balances", authenticateToken, async (req, res) => {
  const { employeeCode } = req.query;
  if (!employeeCode) {
    return res.status(400).json({ message: "missing employeeCode" });
  }
  try {
    const [rows] = await db.query(
      `
        SELECT
          ewb.welfare_type_id AS typeId,
          wt.name AS typeName,
          ewb.balance_amount AS limitAmount,
          COALESCE(SUM(wt2.transaction_amount), 0) AS usedAmount,
          ewb.balance_amount - COALESCE(SUM(wt2.transaction_amount), 0) AS remaining
        FROM employee_welfare_balances ewb
        JOIN welfare_types wt ON ewb.welfare_type_id = wt.id
        LEFT JOIN welfare_transactions wt2
          ON wt2.employee_code = ewb.employee_code AND wt2.welfare_type_id = ewb.welfare_type_id
        WHERE ewb.employee_code = ?
        GROUP BY ewb.id, ewb.welfare_type_id, wt.name, ewb.balance_amount
        ORDER BY wt.name
      `,
      [employeeCode]
    );
    const balances = rows.map((row) => ({
      typeId: row.typeId,
      typeName: row.typeName,
      limit: Number(row.limitAmount),
      used: Number(row.usedAmount),
      remaining: Number(row.remaining),
    }));
    return res.json({ balances });
  } catch (err) {
    console.error("balances error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
});

/**
 * GET /history?employeeCode=BET0047
 *
 * Return the transaction history for an employee code. Each record includes
 * the transaction amount, date, description and the welfare type name.
 */
router.get("/history", authenticateToken, async (req, res) => {
  const { employeeCode } = req.query;
  if (!employeeCode) {
    return res.status(400).json({ message: "missing employeeCode" });
  }
  try {
    const [rows] = await db.query(
      `
        SELECT
          wt.id AS id,
          wt.employee_code AS employeeCode,
          wt.welfare_type_id AS typeId,
          wt.transaction_amount AS amount,
          DATE_FORMAT(wt.transaction_date, '%Y-%m-%d') AS date,
          wt.description AS description,
          wtypes.name AS typeName
        FROM welfare_transactions wt
        JOIN welfare_types wtypes ON wt.welfare_type_id = wtypes.id
        WHERE wt.employee_code = ?
        ORDER BY wt.transaction_date DESC, wt.id DESC
      `,
      [employeeCode]
    );
    const history = rows.map((r) => ({
      id: r.id,
      employeeCode: r.employeeCode,
      typeId: r.typeId,
      amount: Number(r.amount),
      date: r.date,
      description: r.description || "",
      typeName: r.typeName,
    }));
    return res.json({ history });
  } catch (err) {
    console.error("history error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
});

/**
 * POST /claim
 *
 * Create a new welfare claim for an employee. Employees can only claim for
 * themselves; administrators can claim on behalf of any employee. The
 * request body must include employeeCode, typeId and amount. The amount must
 * not exceed the remaining balance for that welfare type.
 */
router.post("/claim", authenticateToken, async (req, res) => {
  const {
    id_code,
    employeeCode,
    typeId,
    amount,
    claimfor,
    description = "",
  } = req.body || {};
  if (!employeeCode || !typeId || !amount || !claimfor || !id_code) {
    return res.status(400).json({ message: "missing fields" });
  }
  // Non‑admins cannot claim for others. In this example we do not know the
  // mapping between user id and employee code, so we only enforce that
  // superadmin and staff may claim for any employee. A real application
  // should verify that req.user.id maps to employeeCode.
  // Only superadmins or staff (including users who also have staff role) can claim
  const userRoles = Array.isArray(req.user.roles)
    ? req.user.roles
    : [req.user.role];
  if (!userRoles.includes("superadmin") && !userRoles.includes("staff")) {
    return res.status(403).json({ message: "forbidden" });
  }
  try {
    // Check current remaining balance for this welfare type
    const [[balRow]] = await db.query(
      `
        SELECT
          ewb.balance_amount AS limitAmount,
          COALESCE(SUM(wt2.transaction_amount), 0) AS usedAmount
        FROM employee_welfare_balances ewb
        LEFT JOIN welfare_transactions wt2
          ON wt2.employee_code = ewb.employee_code AND wt2.welfare_type_id = ewb.welfare_type_id
        WHERE ewb.employee_code = ? AND ewb.welfare_type_id = ?
        GROUP BY ewb.id, ewb.balance_amount
      `,
      [employeeCode, typeId]
    );
    if (!balRow) {
      return res.status(400).json({ message: "no budget" });
    }
    const remaining = Number(balRow.limitAmount) - Number(balRow.usedAmount);
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ message: "invalid amount" });
    }
    if (amt > remaining) {
      return res.status(400).json({ message: "exceed limit", remaining });
    }
    // Insert the transaction. Use NOW() for created_at and transaction_date.
    await db.query(
      `
        INSERT INTO welfare_transactions
          (id_code ,employee_code, welfare_type_id,claimfor, transaction_amount, transaction_date, description, created_by)
        VALUES (?, ?, ?,?, ?, NOW(), ?, ?)
      `,
      [
        id_code,
        employeeCode,
        typeId,
        claimfor,
        amt,
        description,
        req.user.username || "system",
      ]
    );
    // Return the new remaining balance.
    const newRemaining = remaining - amt;
    return res.json({ ok: true, remaining: newRemaining });
  } catch (err) {
    console.error("claim error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
});

/**
 * POST /topup
 *
 * Increase the allocated balance for an employee and welfare type. Only
 * superadmins can perform this operation.
 */
router.post(
  "/topup",
  authenticateToken,
  requireRole(["superadmin"]),
  async (req, res) => {
    const { employeeCode, typeId, add = 0 } = req.body || {};
    if (!employeeCode || !typeId) {
      return res.status(400).json({ message: "missing fields" });
    }
    const addAmt = Number(add) || 0;
    try {
      const [result] = await db.query(
        `
        UPDATE employee_welfare_balances
        SET balance_amount = balance_amount + ?
        WHERE employee_code = ? AND welfare_type_id = ?
      `,
        [addAmt, employeeCode, typeId]
      );
      if (result.affectedRows === 0) {
        return res.status(400).json({ message: "no budget" });
      }
      const [[row]] = await db.query(
        `
        SELECT balance_amount
        FROM employee_welfare_balances
        WHERE employee_code = ? AND welfare_type_id = ?
      `,
        [employeeCode, typeId]
      );
      return res.json({ ok: true, limit: Number(row.balance_amount) });
    } catch (err) {
      console.error("topup error:", err);
      return res.status(500).json({ message: "internal server error" });
    }
  }
);

/**
 * POST /topup-bulk
 *
 * Increase the allocated balance for multiple employees and a single welfare type.
 * Accepts an array of employeeCodes, a typeId and an add amount. Only
 * superadmins may perform this operation. The endpoint returns the number
 * of updated records and any codes that were not found.
 */
router.post(
  "/topup-bulk",
  authenticateToken,
  requireRole(["superadmin"]),
  async (req, res) => {
    const { employeeCodes, typeId, add = 0 } = req.body || {};
    if (
      !Array.isArray(employeeCodes) ||
      employeeCodes.length === 0 ||
      !typeId
    ) {
      return res.status(400).json({ message: "missing fields" });
    }
    const addAmt = Number(add) || 0;
    const notFound = [];
    let updatedCount = 0;
    try {
      for (const code of employeeCodes) {
        const [result] = await db.query(
          `UPDATE employee_welfare_balances SET balance_amount = balance_amount + ? WHERE employee_code = ? AND welfare_type_id = ?`,
          [addAmt, code, typeId]
        );
        if (result.affectedRows === 0) {
          notFound.push(code);
        } else {
          updatedCount += result.affectedRows;
        }
      }
      return res.json({ ok: true, updated: updatedCount, notFound });
    } catch (err) {
      console.error("topup-bulk error:", err);
      return res.status(500).json({ message: "internal server error" });
    }
  }
);

/**
 * POST /budget
 *
 * Create a new welfare budget record for a single employee and type. This
 * endpoint allows superadmins to set up a budget for an employee who
 * does not yet have an entry in employee_welfare_balances. The request
 * body must include the employee's identifying information, the
 * welfare type ID and the initial limit. If a budget already exists
 * for the given employee and type, this endpoint will update the
 * existing limit instead of inserting a new row. The caller should
 * ensure that the employee data is verified (e.g. via GET /employee/:code)
 * before invoking this endpoint.
 */
router.post(
  "/budget",
  authenticateToken,
  requireRole(["superadmin"]),
  async (req, res) => {
    const {
      id_code,
      employee_code,
      fname,
      lname,
      employee_position_number,
      department,
      emp_type,
      typeId,
      limit,
    } = req.body || {};
    if (!employee_code || !typeId || !limit) {
      return res.status(400).json({ message: "missing fields" });
    }
    const limitAmount = Number(limit);
    if (isNaN(limitAmount) || limitAmount <= 0) {
      return res.status(400).json({ message: "invalid limit" });
    }
    try {
      // Check if a budget row already exists
      const [[existing]] = await db.query(
        "SELECT id FROM employee_welfare_balances WHERE employee_code = ? AND welfare_type_id = ?",
        [employee_code, typeId]
      );
      if (existing) {
        // Update the existing limit
        await db.query(
          "UPDATE employee_welfare_balances SET balance_amount = ?, fname = ?, lname = ?, employee_position_number = ?, department = ?, emp_type = ? WHERE id = ?",
          [
            limitAmount,
            fname || "",
            lname || "",
            employee_position_number || "",
            department || "",
            emp_type || "",
            existing.id,
          ]
        );
      } else {
        // Insert a new row
        await db.query(
          `INSERT INTO employee_welfare_balances
          (id_code,employee_code, welfare_type_id, balance_amount, fname, lname, employee_position_number, department, emp_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            id_code,
            employee_code,
            typeId,
            limitAmount,
            fname || "",
            lname || "",
            employee_position_number || "",
            department || "",
            emp_type || "",
          ]
        );
      }
      return res.json({ ok: true });
    } catch (err) {
      console.error("create budget error:", err);
      return res.status(500).json({ message: "internal server error" });
    }
  }
);

/**
 * GET /admins
 *
 * Retrieve the list of users assigned to manage each welfare type. Only
 * superadmins can access this endpoint.
 */
router.get(
  "/admins",
  authenticateToken,
  requireRole(["superadmin"]),
  async (_req, res) => {
    try {
      const [rows] = await db.query(
        `
        SELECT
	  swp.id,
          swp.user_id,
          swp.welfare_type_id AS typeId,
          swp.created_at,
          wt.name AS typeName
        FROM staff_welfare_permission swp
        JOIN welfare_types wt ON swp.welfare_type_id = wt.id
        ORDER BY wt.name
      `
      );
      console.log(rows);
      const admins = rows.map((r) => ({
        userId: r.user_id,
        typeId: r.typeId,
        typeName: r.typeName,
        admin: r.admin,
      }));
      return res.json({ admins });
    } catch (err) {
      console.error("admins list error:", err);
      return res.status(500).json({ message: "internal server error" });
    }
  }
);

/**
 * POST /admins
 *
 * Assign a user to manage a welfare type. Only superadmins can perform
 * this operation. Expects userId and typeId in the body.
 */
router.post(
  "/admins",
  authenticateToken,
  requireRole(["superadmin"]),
  async (req, res) => {
    const { userCode, typeId } = req.body || {};
    if (!userCode || !typeId) {
      return res.status(400).json({ message: "missing fields" });
    }
    try {
      const [[exists]] = await db.query(
        "SELECT id FROM staff_welfare_permission WHERE user_id = ? AND welfare_type_id = ?",
        [userCode, typeId]
      );
      if (exists) {
        return res.status(400).json({ message: "มีผู้ดูแลนี้ในระบบแล้ว" });
      }
      await db.query(
        `
        INSERT INTO staff_welfare_permission (user_id, welfare_type_id, created_at)
        VALUES (?, ?, NOW())
      `,
        [userCode, typeId]
      );
      return res.json({ ok: true });
    } catch (err) {
      console.error("admin add error:", err);
      return res
        .status(500)
        .json({ message: "internal server error" + err.message });
    }
  }
);

/**
 * POST /admins/remove
 *
 * Remove an assignment of a user to manage a welfare type. Only
 * superadmins can perform this operation.
 */
router.post(
  "/admins/remove",
  authenticateToken,
  requireRole(["superadmin"]),
  async (req, res) => {
    const { userId, typeId } = req.body || {};
    if (!userId || !typeId) {
      return res.status(400).json({ message: "missing fields" });
    }
    try {
      const [result] = await db.query(
        "DELETE FROM staff_welfare_permission WHERE user_id = ? AND welfare_type_id = ?",
        [userId, typeId]
      );
      if (result.affectedRows === 0) {
        return res.status(400).json({ message: "not found" });
      }
      return res.json({ ok: true });
    } catch (err) {
      console.error("admin remove error:", err);
      return res.status(500).json({ message: "internal server error" });
    }
  }
);

/**
 * GET /employee/:code
 *
 * Fetch employee information from the external employee API by MEDCODE. The
 * endpoint returns a simplified object with properties matching the
 * welfare system's database columns. Requires authentication. Both
 * superadmins and staff may call this endpoint to validate employees
 * before creating budgets or assignments.
 */
router.get(
  "/employee/:code",
  authenticateToken,
  requireRole(["superadmin", "staff"]),
  async (req, res) => {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ message: "missing employee code" });
    }
    try {
      const apiKey = process.env.EMP_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "missing API key" });
      }
      const url = `https://med.tu.ac.th/emp_api/api/employee/username/${encodeURIComponent(
        code
      )}`;
      // Use the header name "Application-Key" instead of the previous
      // lowercase application_key. Some services expect a specific
      // header casing. See README for details.
      const response = await axios.get(url, {
        headers: { "Application-Key": apiKey },
        timeout: 10000,
      });
      const result = response.data;
      if (!result || result.status === false) {
        return res.status(404).json({ message: "employee not found" });
      }
      const data = result.data || {};
      // Map the external API fields to the internal structure used by this system
      const employee = {
        id_code: data.ID_CODE,
        employee_code: data.MEDCODE,
        fname: data.TFNAME,
        lname: data.TLNAME,
        employee_position_number: data.P_ACCT,
        department: data.SECTION_NAME,
        emp_type: data.TYPE_NAME,
      };
      return res.json({ employee });
    } catch (err) {
      console.error("employee fetch error:", err.response?.data || err.message);
      return res.status(500).json({ message: "employee service error" });
    }
  }
);

/**
 * GET /summary
 *
 * Summarize the total amount of welfare transactions per type for a given year.
 * Only superadmins can access this route. If no year is provided, the
 * current calendar year is used.
 */
router.get(
  "/summary",
  authenticateToken,
  requireRole(["superadmin"]),
  async (req, res) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    try {
      const [rows] = await db.query(
        `
        SELECT
          wtypes.id AS typeId,
          wtypes.name AS typeName,
          COALESCE(SUM(wt.transaction_amount), 0) AS totalAmount
        FROM welfare_types wtypes
        LEFT JOIN welfare_transactions wt
          ON wt.welfare_type_id = wtypes.id
          AND YEAR(wt.transaction_date) = ?
        GROUP BY wtypes.id, wtypes.name
        ORDER BY wtypes.name
      `,
        [year]
      );
      const summary = rows.map((r) => ({
        typeId: r.typeId,
        typeName: r.typeName,
        total: Number(r.totalAmount),
      }));
      return res.json({ summary });
    } catch (err) {
      console.error("summary error:", err);
      return res.status(500).json({ message: "internal server error" });
    }
  }
);

/**
 * GET /employees
 *
 * List all distinct employees that have welfare balances. Each employee
 * is returned with their code and a concatenated full name. Roles are
 * not checked here because employees may need to load this list on the
 * front end. If you wish to restrict access, add requireRole().
 */
router.get("/employees", authenticateToken, async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT DISTINCT id_code, employee_code AS code, fname, lname
       FROM employee_welfare_balances
       ORDER BY fname, lname`
    );
    const employees = rows.map((r) => ({
      id_code: r.id_code,
      code: r.code,
      name: [r.fname, r.lname].filter(Boolean).join(" "),
    }));
    return res.json({ employees });
  } catch (err) {
    console.error("employees list error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
});

/**
 * GET /types
 *
 * Return the list of welfare types (id and name). This is useful for
 * populating selects in the front end. No role restriction applied.
 */
router.get("/types", authenticateToken, async (_req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name FROM welfare_types ORDER BY name"
    );
    return res.json({ types: rows });
  } catch (err) {
    console.error("types list error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
});

/**
 * POST /types
 *
 * Create a new welfare type. Only superadmins are allowed to add new
 * categories. The request body must include a "name" field. Returns
 * ok: true on success.
 */
router.post(
  "/types",
  authenticateToken,
  requireRole(["superadmin"]),
  async (req, res) => {
    const { name } = req.body || {};
    if (!name) {
      return res.status(400).json({ message: "missing fields" });
    }
    try {
      await db.query(
        "INSERT INTO welfare_types (name, created_at) VALUES (?, NOW())",
        [name]
      );
      return res.json({ ok: true });
    } catch (err) {
      console.error("type add error:", err);
      return res.status(500).json({ message: "internal server error" });
    }
  }
);

/**
 * DELETE /types/:id
 *
 * Delete an existing welfare type by ID. Only superadmins may perform
 * this operation. If the type is referenced by budgets or transactions,
 * the database may reject the delete due to foreign key constraints.
 */
router.delete(
  "/types/:id",
  authenticateToken,
  requireRole(["superadmin"]),
  async (req, res) => {
    const id = req.params.id;
    try {
      const [result] = await db.query(
        "DELETE FROM welfare_types WHERE id = ?",
        [id]
      );
      if (result.affectedRows === 0) {
        return res.status(400).json({ message: "not found" });
      }
      return res.json({ ok: true });
    } catch (err) {
      console.error("type delete error:", err);
      return res.status(500).json({ message: "internal server error" });
    }
  }
);

/**
 * GET /budgets
 *
 * Return all welfare budgets for every employee and welfare type. Each
 * record includes the employee code, full name, welfare type, annual
 * limit, used amount and remaining balance. Optionally filter by
 * welfare_type_id via the `typeId` query parameter. Only
 * superadmin and staff can access this endpoint.
 */
router.get(
  "/budgets",
  authenticateToken,
  requireRole(["superadmin", "staff"]),
  async (req, res) => {
    const { typeId, empType } = req.query;
    try {
      const params = [];
      let typeClause = "";
      if (typeId) {
        typeClause = "AND ewb.welfare_type_id = ?";
        params.push(typeId);
      }
      let empTypeClause = "";
      if (empType) {
        empTypeClause = "AND ewb.emp_type = ?";
        params.push(empType);
      }
      const [rows] = await db.query(
        `SELECT
         ewb.id_code AS id_code,
         ewb.employee_code AS employeeCode,
         ewb.fname AS fname,
         ewb.lname AS lname,
         ewb.welfare_type_id AS typeId,
         ewb.emp_type AS emp_type,
         wt.name AS typeName,
         ewb.balance_amount AS limitAmount,
         COALESCE(SUM(wt2.transaction_amount), 0) AS usedAmount,
         ewb.balance_amount - COALESCE(SUM(wt2.transaction_amount), 0) AS remaining
       FROM employee_welfare_balances ewb
       JOIN welfare_types wt ON ewb.welfare_type_id = wt.id
       LEFT JOIN welfare_transactions wt2
         ON wt2.employee_code = ewb.employee_code
         AND wt2.welfare_type_id = ewb.welfare_type_id
       WHERE 1=1 ${typeClause} ${empTypeClause}
       GROUP BY ewb.id, ewb.employee_code, ewb.fname, ewb.lname, ewb.welfare_type_id, wt.name, ewb.balance_amount
       ORDER BY ewb.employee_code, wt.name`,
        params
      );
      const budgets = rows.map((r) => ({
        id_code: r.id_code,
        employeeCode: r.employeeCode,
        employeeName: [r.fname, r.lname].filter(Boolean).join(" "),
        emp_type: r.emp_type,
        typeId: r.typeId,
        typeName: r.typeName,
        limit: Number(r.limitAmount),
        used: Number(r.usedAmount),
        remaining: Number(r.remaining),
      }));
      return res.json({ budgets });
    } catch (err) {
      console.error("budgets list error:", err);
      return res.status(500).json({ message: "internal server error" });
    }
  }
);

/**
 * GET /search
 *
 * Search for welfare transactions based on optional criteria:
 * - employeeCode: exact employee code
 * - name: partial match on first or last name
 * - dateFrom/dateTo: ISO formatted date range (inclusive)
 *
 * Only superadmins can perform searches. If no criteria are provided the
 * result will include all transactions.
 */
router.get(
  "/search",
  authenticateToken,
  requireRole(["superadmin", "staff"]),
  async (req, res) => {
    const { employeeCode, name, dateFrom, dateTo } = req.query;
    const conditions = [];
    const params = [];
    // Filter by employee code
    if (employeeCode) {
      conditions.push("wt.employee_code = ?");
      params.push(employeeCode);
    }
    // Filter by name (partial match on first or last name)
    if (name) {
      const like = `%${name}%`;
      conditions.push("(ewb.fname LIKE ? OR ewb.lname LIKE ?)");
      params.push(like, like);
    }
    // Filter by date range
    if (dateFrom && dateTo) {
      conditions.push("DATE(wt.transaction_date) BETWEEN ? AND ?");
      params.push(dateFrom, dateTo);
    } else if (dateFrom) {
      conditions.push("DATE(wt.transaction_date) >= ?");
      params.push(dateFrom);
    } else if (dateTo) {
      conditions.push("DATE(wt.transaction_date) <= ?");
      params.push(dateTo);
    }
    // Restrict staff to only their assigned welfare types. Superadmins can see all.
    const userRoles = Array.isArray(req.user.roles)
      ? req.user.roles
      : [req.user.role];
    if (!userRoles.includes("superadmin")) {
      const assignments = req.user.staffAssignments || [];
      if (assignments.length === 0) {
        return res.json({ results: [] });
      }
      // Use a parameterised IN clause for assignments
      const placeholders = assignments.map(() => "?").join(",");
      conditions.push(`wt.welfare_type_id IN (${placeholders})`);
      params.push(...assignments);
    }
    const whereClause = conditions.length
      ? "WHERE " + conditions.join(" AND ")
      : "";
    try {
      const [rows] = await db.query(
        `
        SELECT
          wt.id,
          wt.employee_code AS employeeCode,
          wt.welfare_type_id AS typeId,
          wt.transaction_amount AS amount,
          DATE_FORMAT(wt.transaction_date, '%Y-%m-%d') AS date,
          wt.description AS description,
          wtypes.name AS typeName,
          ewb.fname AS firstName,
          ewb.lname AS lastName
        FROM welfare_transactions wt
        JOIN welfare_types wtypes ON wt.welfare_type_id = wtypes.id
        -- Join on both employee_code and welfare_type_id to avoid duplicate rows when an employee has multiple welfare balances
        LEFT JOIN employee_welfare_balances ewb
          ON ewb.employee_code = wt.employee_code
         AND ewb.welfare_type_id = wt.welfare_type_id
        ${whereClause}
        ORDER BY wt.transaction_date DESC, wt.id DESC
      `,
        params
      );
      const results = rows.map((r) => ({
        id: r.id,
        employeeCode: r.employeeCode,
        typeId: r.typeId,
        typeName: r.typeName,
        amount: Number(r.amount),
        date: r.date,
        description: r.description || "",
        fullName:
          r.firstName && r.lastName ? `${r.firstName} ${r.lastName}` : "",
      }));
      return res.json({ results });
    } catch (err) {
      console.error("search error:", err);
      return res.status(500).json({ message: "internal server error" });
    }
  }
);

/**
 * GET /assignments
 *
 * Return the list of welfare type IDs that the current authenticated user
 * is assigned to manage. If the user does not have a staff role or no
 * assignments exist, an empty array is returned. This endpoint can be
 * used by the front‑end to determine which administration features a
 * logged‑in user should be allowed to access. The user must be
 * authenticated, but no specific role is required. If the user has
 * multiple roles, assignments are only returned for staff roles.
 */
router.get("/assignments", authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    // Only users with a staff or superadmin role have assignments.
    const roles = Array.isArray(user.roles) ? user.roles : [user.role];
    if (!roles.includes("staff") && !roles.includes("superadmin")) {
      return res.json({ assignments: [] });
    }
    const userCode = user.id;
    if (!userCode) {
      return res.json({ assignments: [] });
    }
    const [rows] = await db.query(
      "SELECT welfare_type_id FROM staff_welfare_permission WHERE user_id = ?",
      [userCode]
    );
    const assignments = rows.map((r) => r.welfare_type_id);
    return res.json({ assignments });
  } catch (err) {
    console.error("assignments error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
});

export default router;
