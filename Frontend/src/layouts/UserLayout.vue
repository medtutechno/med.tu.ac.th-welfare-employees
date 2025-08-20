<template>
  <v-app>
    <!-- Top app bar for user pages. Omit app prop to span full width. -->
    <v-app-bar color="#2c3e50" dark style="width: 100%">
      <v-toolbar-title>
        <div>ระบบสวัสดิการพนักงาน</div>
        <div class="text-caption w-100">
          {{ currentUser }}
        </div>
      </v-toolbar-title>
      <v-spacer />
      <v-btn variant="text" @click="handleLogout">ออกจากระบบ</v-btn>
    </v-app-bar>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup>
import { useRouter } from "vue-router";
import { currentUser, logout } from "../stores/auth.js";

const router = useRouter();

async function handleLogout() {
  await logout();
  router.push({ name: "login" });
}
</script>

<style scoped>
/*
 * Customise the user dashboard header to align with the admin theme.
 * We use deep selectors to target the Vuetify components and set
 * a consistent blue background and white text.
 */

:deep(.v-app-bar) {
  background-color: #2c3e50; /* same medium blue as admin header */
  color: #ffffff;
}

:deep(.v-toolbar-title) {
  font-weight: 600;
}
</style>
