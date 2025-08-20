import jwt from "jsonwebtoken";
import dotenv from "dotenv";

// Load environment variables. This ensures JWT_SECRET is available.
dotenv.config();

/**
 * Authenticate incoming requests using a JWT provided in the Authorization
 * header. The token must be prefaced by the "Bearer " scheme. If the token
 * is valid, the decoded payload is attached to req.user and the next
 * middleware is invoked. Otherwise a 401 response is returned.
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "missing token" });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ message: "invalid token" });
    }
    req.user = user;
    console.log(req.user);
    next();
  });
}

/**
 * Require that the authenticated user possesses one of the specified roles.
 * If the user's role is not in the allowed list, a 403 response is
 * returned. Otherwise the request proceeds.
 *
 * @param {string[]} roles Allowed roles, e.g. ['superadmin', 'staff']
 */
export function requireRole(roles) {
  /**
   * Authorize a request based on the user roles. The authenticated user
   * may have a single role (user.role) or an array of roles (user.roles).
   * Access is granted if any of the required roles is present in the user's
   * roles list. Otherwise a 403 response is returned. This helper supports
   * scenarios where a user can act both as a general user and as a staff
   * member (e.g. roles: ['user','staff']).
   *
   * @param {string[]} roles Allowed roles, e.g. ['superadmin','staff']
   */
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(403).json({ message: "forbidden" });
    }
    // Normalise to an array of roles on the user. If a single role is
    // provided, wrap it in an array.
    const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];
    const allowed = roles.some((role) => userRoles.includes(role));
    if (!allowed) {
      return res.status(403).json({ message: "forbidden" });
    }
    next();
  };
}
