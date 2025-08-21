<template>
  <v-app>
    <!-- Navigation drawer on the left for admin menu -->
    <v-navigation-drawer
      v-model="drawer"
      :permanent="!mobile"
      location="start"
      app
      color="#2c3e50"
      dark
    >
      <!-- Logo or application title at the top of the drawer -->
      <v-list-item class="mb-4 d-flex w-100 justify-center">
        <div class="d-flex flex-column ga-2">
          <v-list-item-title class="text-h5 font-weight-bold mt-4">
            <v-img
              :width="125"
              aspect-ratio="16/9"
              cover
              src="/medlogopng.png"
            ></v-img>
          </v-list-item-title>
          <div class="d-flex flex-column">
            <div>Welfare Employee</div>
            <div class="text-caption text-center">Admin System</div>
          </div>
        </div>
      </v-list-item>
      <v-divider class="mb-2" />
      <v-list>
        <v-list-item
          v-for="item in navItems"
          :key="item.route"
          :to="{ name: item.route }"
          link
        >
          <!-- Prepend an icon to each nav entry when provided -->
          <div class="d-flex ga-2">
            <template v-if="item.icon">
              <v-list-item-icon>
                <v-icon>{{ item.icon }}</v-icon>
              </v-list-item-icon>
            </template>
            <v-list-item-title>{{ item.title }}</v-list-item-title>
          </div>
        </v-list-item>
      </v-list>
      <v-spacer></v-spacer>
      <v-divider class="my-2" />
      <v-list>
        <!-- Logout option at bottom of drawer -->
        <v-list-item @click="handleLogout" role="button">
          <div class="d-flex ga-2">
            <v-list-item-icon><v-icon>mdi-logout</v-icon></v-list-item-icon>
            <v-list-item-title>ออกจากระบบ</v-list-item-title>
          </div>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
    <!-- Top app bar. Omit app prop so it spans full width. -->
    <v-app-bar dark style="width: 100%">
      <v-app-bar-nav-icon @click="drawer = !drawer" class="d-md-none" />
      <v-toolbar-title>
        <div>ผู้ใช้งาน : {{ currentUser.username }}</div>
        <div class="text-caption">
          {{ currentUser }}
        </div>
      </v-toolbar-title>
    </v-app-bar>
    <!-- Main content for admin pages -->
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import { currentUser, logout } from "../stores/auth.js";

const router = useRouter();
const drawer = ref(null);
const { mobile } = useDisplay();

// Compute the admin navigation items. If the current user also has
// the "user" role (i.e. a staff member), include a link to the
// personal employee dashboard.
const navItems = computed(() => {
  // Define the base admin menu with icons to improve visual hierarchy. See
  // https://materialdesignicons.com/ for additional icons.
  const base = [
    { title: "แดชบอร์ด", route: "admin-summary", icon: "mdi-view-dashboard" },
    { title: "รายงาน", route: "admin-reports", icon: "mdi-file-chart" },
    { title: "เพิ่มข้อมูล", route: "admin-add", icon: "mdi-plus-box" },
    { title: "เบิก/แก้ไข", route: "admin-edit", icon: "mdi-pencil" },
    {
      title: "ตั้งค่าวงเงิน",
      route: "admin-year-settings",
      icon: "mdi-calendar-edit",
    },
    {
      title: "ประเภทสวัสดิการ",
      route: "admin-categories",
      icon: "mdi-format-list-bulleted",
    },
    { title: "ประวัติการเบิก", route: "admin-history", icon: "mdi-history" },
    { title: "ผู้ดูแล", route: "admin-admins", icon: "mdi-account-cog" },
  ];
  const user = currentUser.value;
  if (user) {
    const roles = Array.isArray(user.roles) ? user.roles : [user.role];
    if (roles.includes("user")) {
      base.push({
        title: "สวัสดิการของฉัน",
        route: "employee",
        icon: "mdi-account",
      });
    }
  }
  return base;
});

async function handleLogout() {
  await logout();
  router.push({ name: "login" });
}
</script>

<style scoped>
/*
 * Customise the admin dashboard look and feel.  The sidebar (navigation
 * drawer) is given a dark blue background with white text to mirror
 * the sample dashboard provided by the user.  The top application bar
 * uses a slightly lighter blue and white text.  Vuetify internally
 * scopes component styles, so we use :deep() selectors to target
 * generated DOM classes.  See https://v2.vuejs.org/v2/guide/scoped-css.html#Deep-Selectors
 */

/* Style the navigation drawer (sidebar) */
:deep(.v-navigation-drawer) {
  background-color: #001e3c; /* dark navy background */
  color: #ffffff;
}

/* Ensure list item titles inside the drawer remain white */
:deep(.v-navigation-drawer .v-list-item-title) {
  color: #ffffff;
}

/* Colour the icons in the drawer */
:deep(.v-navigation-drawer .v-list-item-icon .v-icon) {
  color: #ffffff;
}

/* Style the top application bar */
:deep(.v-app-bar) {
  /* background-color: #17559a; medium blue for header */
  color: #000000;
}

/* Bolden the toolbar title */
:deep(.v-toolbar-title) {
  font-weight: 600;
}
</style>
