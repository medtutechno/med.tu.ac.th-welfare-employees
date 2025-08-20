import { ref } from "vue";
import http from "../api/http.js";

// Holds the currently authenticated user. A value of undefined
// indicates that the user state has not yet been loaded from the server.
const currentUser = ref(undefined);

/**
 * Attempt to log in using the provided credentials. Sends the credentials
 * to the API and, on success, stores the user object and JWT. The JWT is
 * persisted in localStorage under the key "token". The Authorization
 * header will be automatically added to all subsequent requests by the
 * Axios interceptor defined in api/http.js.
 *
 * @param {string} username
 * @param {string} password
 * @returns {Promise<boolean>}
 */
export async function login(username, password) {
  try {
    const { data } = await http.post("/auth/login", { username, password });
    currentUser.value = data.user;
    console.log(currentUser.value);
    console.log("data", data);
    if (data.token) {
      localStorage.setItem("token", data.token);
    }
    return true;
  } catch (err) {
    currentUser.value = null;
    return false;
  }
}

/**
 * Fetch the current user from the server. Should be called on application
 * startup or page reload to synchronize the session state.
 *
 * @returns {Promise<boolean>}
 */
export async function fetchMe() {
  try {
    const { data } = await http.get("/auth/me");
    currentUser.value = data.user;
    return true;
  } catch (_err) {
    // If the token is invalid or missing, clear the user state.
    currentUser.value = null;
    return false;
  }
}

/**
 * Log out the current user via the API and clear the local session state.
 */
export async function logout() {
  // JWTs are stateless, so the back‑end does not need to be notified
  // when a user logs out. Simply remove the stored token and clear
  // the user state.
  currentUser.value = null;
  localStorage.removeItem("token");
}

export { currentUser };
