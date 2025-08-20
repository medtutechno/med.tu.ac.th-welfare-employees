<template>
  <!-- Employee dashboard content is rendered inside the user layout. -->
  <v-container class="mt-4">
    <v-card class="pa-4">
      <v-card-title>ข้อมูลสวัสดิการของพนักงาน</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="6">
            <!-- Show employee selection only for superadmin or staff. For general users, display their name. -->
            <template v-if="!isGeneralUser">
              <v-select
                v-model="selectedEmployee"
                :items="employees"
                item-title="name"
                item-value="code"
                label="เลือกพนักงาน"
              />
            </template>
            <template v-else>
              <p class="text-subtitle-1 font-weight-medium">
                พนักงาน: {{ currentUser.fname }} {{ currentUser.lname }} (
                {{ employeeName }})
              </p>
            </template>
          </v-col>
          <v-col cols="12" sm="4" v-if="selectedEmployee">
            <!-- Welfare type filter -->
            <v-select
              v-model="selectedType"
              :items="types"
              item-title="name"
              item-value="id"
              label="ประเภทสวัสดิการ"
              clearable
            />
          </v-col>
        </v-row>
        <div v-if="selectedEmployee">
          <h3 class="mt-4">ยอดคงเหลือ</h3>
          <!-- Use reusable table component for balances -->
          <BaseTable
            :headers="balanceHeaders"
            :items="filteredBalances"
            :items-per-page="5"
            class="mb-4"
          />
          <h3 class="mt-4">ประวัติการเบิก</h3>
          <BaseTable
            :headers="historyHeaders"
            :items="filteredHistory"
            :items-per-page="5"
          />
        </div>
        <div v-else class="mt-4">
          <p>กรุณาเลือกพนักงานเพื่อดูข้อมูล</p>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { currentUser } from "../stores/auth.js";
import BaseTable from "../components/BaseTable.vue";
import http from "../api/http.js";

// List of employees loaded from the API. Each has code and name.
const employees = ref([]);

// The currently selected employee code. Using code directly instead of id
// because the API uses employeeCode as the parameter.
const selectedEmployee = ref("");

// List of welfare types for filtering balances and history
const types = ref([]);
const selectedType = ref(null);

const balanceHeaders = [
  { title: "ประเภท", value: "typeName" },
  { title: "วงเงิน", value: "limit" },
  { title: "ใช้ไปแล้ว", value: "used" },
  { title: "คงเหลือ", value: "remaining" },
];

const historyHeaders = [
  { title: "วันที่", value: "date" },
  { title: "ประเภท", value: "typeName" },
  { title: "จำนวนเงิน", value: "amount" },
  { title: "รายละเอียด", value: "description" },
];

// Reactive arrays for balances and claim history
const balances = ref([]);
const employeeClaims = ref([]);

// Indicate whether the current user is a plain user (not staff or superadmin).
// A user is considered a general user if they have only the "user" role and
// no staff or superadmin roles. We still allow staff to view their personal
// benefits on the Employee dashboard if they navigate here via the menu.
const isGeneralUser = computed(() => {
  const user = currentUser.value;
  if (!user) return false;
  const roles = Array.isArray(user.roles) ? user.roles : [user.role];
  return (
    roles.includes("user") &&
    !roles.includes("superadmin") &&
    !roles.includes("staff")
  );
});

// Compute the employee name for display based on the selected code
const employeeName = computed(() => {
  const code = selectedEmployee.value;
  const emp = employees.value.find((e) => e.code === code);
  return emp ? emp.name : code;
});

// Filtered balances based on the selected welfare type. If no type
// selected, return all balances.
const filteredBalances = computed(() => {
  if (!selectedType.value) return balances.value;
  return balances.value.filter((b) => b.typeId === selectedType.value);
});

// Filtered history based on the selected welfare type. If no type
// selected, return all claims.
const filteredHistory = computed(() => {
  if (!selectedType.value) return employeeClaims.value;
  return employeeClaims.value.filter((c) => c.typeId === selectedType.value);
});

/**
 * Fetch the list of employees from the API. The endpoint returns the
 * employee code and full name. Errors are silently ignored.
 */
async function fetchEmployees() {
  try {
    const { data } = await http.get("/benefits/employees");
    employees.value = data.employees || [];
  } catch (_err) {
    employees.value = [];
  }
}

async function fetchTypes() {
  try {
    const { data } = await http.get("/benefits/types");
    types.value = data.types || [];
  } catch (_err) {
    types.value = [];
  }
}
/**
 * Load the balances and history for the selected employee. If no
 * employee is selected, clear the data. API errors are silently
 * ignored.
 */
async function loadEmployeeData(code) {
  if (!code) {
    balances.value = [];
    employeeClaims.value = [];
    return;
  }
  try {
    const { data: balData } = await http.get("/benefits/balances", {
      params: { employeeCode: code },
    });
    balances.value = balData.balances || [];
  } catch (_err) {
    balances.value = [];
  }
  try {
    const { data: histData } = await http.get("/benefits/history", {
      params: { employeeCode: code },
    });
    employeeClaims.value = histData.history || [];
  } catch (_err) {
    employeeClaims.value = [];
  }
}

// Watch for changes to the selected employee code and load data.
watch(
  selectedEmployee,
  (newCode) => {
    loadEmployeeData(newCode);
  },
  { immediate: false }
);

// Watch for changes in the authenticated user and auto‑select their employee code
watch(
  () => currentUser.value,
  (newUser) => {
    if (newUser) {
      const code = newUser.employee_code;
      if (code && code !== selectedEmployee.value) {
        selectedEmployee.value = code;
        loadEmployeeData(code);
      }
    }
  }
);

// Load employees on mount. We do not auto‑select an employee; the user
// must choose their code from the list. If you wish to map the
// logged‑in user to an employeeCode automatically, you can include
// employee_code on the JWT payload and use it here.
onMounted(() => {
  fetchEmployees();
  fetchTypes();
  // For general users, automatically select their own employee code
  const user = currentUser.value;
  console.log(user);
  if (user && user.username) {
    selectedEmployee.value = user.username;
    loadEmployeeData(user.username);
  }
  console.log(currentUser.value);
});

async function handleLogout() {
  await logout();
  router.push({ name: "login" });
}
</script>

<style scoped>
/* Styles for the employee dashboard can go here. */
</style>
