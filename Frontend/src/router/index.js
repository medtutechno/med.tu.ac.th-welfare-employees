import { createRouter, createWebHistory } from "vue-router";
import AdminLayout from "../layouts/AdminLayout.vue";
import AdminSummary from "../views/AdminSummary.vue";
import UserLayout from "../layouts/UserLayout.vue";
import EmployeeDashboard from "../views/EmployeeDashboard.vue";
import AdminReports from "../views/AdminReports.vue";
import AdminAdd from "../views/AdminAdd.vue";
import AdminEdit from "../views/AdminEdit.vue";
import AdminYearSettings from "../views/AdminYearSettings.vue";
import AdminCategories from "../views/AdminCategories.vue";
import AdminHistory from "../views/AdminHistory.vue";
import AdminAdmins from "../views/AdminAdmins.vue";
import Login from "../views/Login.vue";
import { currentUser, fetchMe } from "../stores/auth.js";

// Define application routes. The admin section nests its pages under /admin.
const routes = [
  {
    path: "/admin",
    component: AdminLayout,
    // Admin routes require authentication and one of the admin roles. In this
    // application superadmin and staff are treated as administrators.
    meta: { requiresAuth: true, roles: ["superadmin", "staff"] },
    children: [
      { path: "", redirect: { name: "admin-summary" } },
      { path: "reports", name: "admin-reports", component: AdminReports },
      { path: "add", name: "admin-add", component: AdminAdd },
      { path: "edit", name: "admin-edit", component: AdminEdit },
      {
        path: "year-settings",
        name: "admin-year-settings",
        component: AdminYearSettings,
      },
      {
        path: "categories",
        name: "admin-categories",
        component: AdminCategories,
      },
      { path: "history", name: "admin-history", component: AdminHistory },
      { path: "admins", name: "admin-admins", component: AdminAdmins },
      // New summary page for administrators. Only superadmin may view this page
      {
        path: "summary",
        name: "admin-summary",
        component: AdminSummary,
        meta: { roles: ["superadmin"] },
      },
    ],
  },
  {
    path: "/employee",
    component: UserLayout,
    meta: { requiresAuth: true, roles: ["user"] },
    children: [{ path: "", name: "employee", component: EmployeeDashboard }],
  },
  {
    path: "/login",
    name: "login",
    component: Login,
    meta: { guestOnly: true },
  },
  {
    path: "/",
    // Always start at the login page. The navigation guard will redirect
    // logged‑in users to the appropriate dashboard based on their role.
    redirect: "/login",
  },
];

// Create the router instance using HTML5 history mode.
const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Global navigation guard for authentication and authorization. Because
// currentUser may be undefined on initial page load, attempt to fetch the
// current session from the API before making access decisions. Note that
// the guard can return a promise; Vue Router will wait until it resolves.
router.beforeEach(async (to, from, next) => {
  // If user state is undefined, load it from the server. Errors are ignored.
  if (currentUser.value === undefined) {
    try {
      await fetchMe();
    } catch (_err) {
      // ignore
    }
  }
  const user = currentUser.value;
  // Redirect unauthenticated users to the login page when the route requires auth.
  if (to.matched.some((record) => record.meta.requiresAuth) && !user) {
    return next({ name: "login" });
  }
  // If the route defines roles, ensure the logged in user has one of them.
  const requiredRoles = to.matched
    .filter((record) => record.meta.roles)
    .map((record) => record.meta.roles)
    .flat();
  if (requiredRoles.length && user) {
    // Normalise user roles to an array for multi-role support
    const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));
    if (!hasRole) {
      // Redirect based on the highest privilege role. Superadmin > staff > user
      if (userRoles.includes("superadmin") || userRoles.includes("staff")) {
        return next({ name: "admin-reports" });
      } else if (userRoles.includes("user")) {
        return next({ name: "employee" });
      } else {
        return next({ name: "login" });
      }
    }
  }
  // Prevent authenticated users from visiting guest‑only pages.
  if (to.matched.some((record) => record.meta.guestOnly) && user) {
    // Redirect authenticated users away from guest pages based on role.
    const roles = Array.isArray(user.roles) ? user.roles : [user.role];
    if (roles.includes("superadmin") || roles.includes("staff")) {
      return next({ name: "admin-reports" });
    } else if (roles.includes("user")) {
      return next({ name: "employee" });
    } else {
      return next({ name: "login" });
    }
  }
  return next();
});

export default router;
