<template>
  <v-app>
    <v-main>
      <v-container
        class="d-flex justify-center align-center"
        style="height: 100vh"
      >
        <v-card class="pa-4" width="400">
          <v-card-title class="justify-center">
            <div class="d-flex flex-column w-100 align-center">
              <v-img
                :width="125"
                aspect-ratio="16/9"
                cover
                src="/medlogopng.png"
              ></v-img>
              <div>เข้าสู่ระบบเงินสวัสดิการ</div>
            </div>
            <v-alert v-if="error" :title="error" type="error"></v-alert>
          </v-card-title>
          <v-card-text>
            <!-- <v-select
              v-model="selectRole"
              label="Select"
              :items="['ผู้ใช้งาน', 'ผู้ดูแลระบบ']"
            ></v-select> -->
            <v-text-field v-model="username" label="ชื่อผู้ใช้" />
            <v-text-field v-model="password" label="รหัสผ่าน" type="password" />
            <v-btn color="primary" class="mt-2" block @click="handleLogin"
              >เข้าสู่ระบบ</v-btn
            >
          </v-card-text>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, nextTick } from "vue";
import { useRouter } from "vue-router";
import { login, currentUser } from "../stores/auth.js";

const username = ref("");
const password = ref("");
const selectRole = ref(null);
const error = ref("");
const router = useRouter();

async function handleLogin() {
  if (!username.value || !password.value) {
    // if (!username.value || !password.value || !selectRole.value) {
    error.value = "โปรดกรอกข้อมูลให้ครบ";
    console.log(error.value);
    return;
  }
  error.value = "";
  const success = await login(username.value, password.value);
  if (success) {
    // Wait a tick to ensure the currentUser ref is updated across components.
    await nextTick();
    const user = currentUser.value;
    // Redirect based on role. Both superadmin and staff are treated as admins.
    if (user) {
      const roles = Array.isArray(user.roles) ? user.roles : [user.role];
      const isAdmin = roles.includes("superadmin") || roles.includes("staff");
      if (isAdmin) {
        router.push({ path: "admin" });
      } else {
        router.push({ name: "employee" });
      }
    }
  } else {
    error.value = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
  }
}
</script>

<style scoped>
.text-error {
  color: red;
}
</style>
