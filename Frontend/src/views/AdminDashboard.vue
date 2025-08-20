<template>
  <v-app>
    <!-- Navigation drawer on the left for admin menu -->
    <v-navigation-drawer
      v-model="drawer"
      :permanent="!mobile"
      location="start"
      app
    >
      <!-- Logo or application title at the top of the drawer -->
      <v-list-item class="mb-4">
        <!-- Replace the text below with an image component if you add a real logo file. -->
        <v-list-item-title class="text-h5 font-weight-bold">Welfare</v-list-item-title>
      </v-list-item>
      <v-divider class="mb-2" />
      <v-list>
        <v-list-item
          v-for="item in navItems"
          :key="item.route"
          :to="{ name: item.route }"
          link
        >
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item>
      </v-list>
      <v-spacer></v-spacer>
      <v-divider class="my-2" />
      <v-list>
        <!-- Logout option at bottom of drawer -->
        <v-list-item @click="handleLogout" role="button">
          <v-list-item-title>ออกจากระบบ</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
    <!-- Top app bar with nav icon for toggling drawer on mobile.  We omit the `app` prop so the bar spans the full width instead of being offset by the drawer. -->
    <v-app-bar color="primary" dark style="width: 100%;">
      <v-app-bar-nav-icon @click="drawer = !drawer" class="d-md-none" />
      <v-toolbar-title>ระบบสวัสดิการ - ผู้ดูแล</v-toolbar-title>
    </v-app-bar>
    <!-- Main content -->
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed } from 'vue';
import { logout, currentUser } from '../stores/auth.js';
import { useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';

const router = useRouter();
// Drawer state: null means closed on mobile and open on desktop
const drawer = ref(null);
const { mobile } = useDisplay();

// Compute the admin navigation items. If the current user also has
// the "user" role (i.e. a staff member), include a link to the
// personal employee dashboard. Otherwise, omit it. Use a computed
// property so the navigation updates when the user state changes.
const navItems = computed(() => {
  const base = [
    { title: 'รายงาน', route: 'admin-reports' },
    { title: 'เพิ่มข้อมูล', route: 'admin-add' },
    { title: 'เบิก/แก้ไข', route: 'admin-edit' },
    { title: 'ตั้งค่าวงเงิน', route: 'admin-year-settings' },
    { title: 'ประเภทสวัสดิการ', route: 'admin-categories' },
    { title: 'ประวัติ', route: 'admin-history' },
    { title: 'แดชบอร์ด', route: 'admin-summary' },
    { title: 'ผู้ดูแล', route: 'admin-admins' },
  ];
  const user = currentUser.value;
  if (user) {
    const roles = Array.isArray(user.roles) ? user.roles : [user.role];
    if (roles.includes('user')) {
      base.push({ title: 'สวัสดิการของฉัน', route: 'employee' });
    }
  }
  return base;
});

async function handleLogout() {
  await logout();
  router.push({ name: 'login' });
}
</script>

<style scoped>
/* Add any scoped styles for the admin dashboard here. */
</style>