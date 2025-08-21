<template>
  <v-container>
    <!-- Top up budget form -->
    <v-card class="pa-4 mb-4">
      <v-card-title>ปรับวงเงินสวัสดิการ</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="4">
            <!-- Multi-select employees with search. Use v-autocomplete to allow searching by name or code -->
            <v-autocomplete
              v-model="selectedEmployees"
              :items="employees"
              item-title="name"
              item-value="code"
              label="พนักงาน (เลือกได้หลายคน)"
              multiple
              clearable
            />
          </v-col>
          <v-col cols="12" sm="4">
            <v-select
              v-model="selectedType"
              :items="filteredTypes"
              item-title="name"
              item-value="id"
              label="ประเภทสวัสดิการ"
              clearable
            />
          </v-col>
          <v-col cols="12" sm="3">
            <v-text-field
              v-model.number="amount"
              label="จำนวนเงิน"
              type="number"
              suffix="บาท"
            />
          </v-col>
          <v-col cols="12" sm="1" class="d-flex align-end">
            <v-btn color="primary" @click="submitTopup" :disabled="!canTopup"
              >เพิ่มเงิน</v-btn
            >
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Table of current budgets -->
    <v-card class="pa-4">
      <v-card-title>วงเงินสวัสดิการปัจจุบัน</v-card-title>
      <v-card-text>
        <v-row class="mb-3">
          <v-col cols="12" sm="4">
            <!-- Filter budgets by welfare type -->
            <v-select
              v-model="filterTypeId"
              :items="filteredTypes"
              item-title="name"
              item-value="id"
              label="กรองตามประเภท"
              clearable
            />
          </v-col>
          <v-col cols="12" sm="4">
            <!-- Search budgets by employee code or name -->
            <v-text-field
              v-model="budgetSearch"
              label="ค้นหา (รหัสพนักงานหรือชื่อ)"
              clearable
            />
          </v-col>
        </v-row>
        <!-- {{ filteredBudgets }} -->
        <v-data-table
          :headers="headers"
          :items="filteredBudgets"
          :items-per-page="10"
          density="compact"
        />
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { currentUser } from "../stores/auth.js";
import http from "../api/http.js";

// Lists of employees and welfare types loaded from the API.
const employees = ref([]);
const types = ref([]);
// Filtered welfare types based on staff assignments. Superadmins see all types,
// staff see only their assignments.
const filteredTypes = computed(() => {
  const user = currentUser.value;
  if (!user) return types.value;
  const roles = Array.isArray(user.roles) ? user.roles : [user.role];
  if (roles.includes("superadmin")) return types.value;
  if (roles.includes("staff")) {
    const assignments = user.staffAssignments || [];
    return types.value.filter((t) => assignments.includes(t.id));
  }
  return [];
});

// Selected values in the top‑up form.
// Allow selecting multiple employees to top up in one request. If more than one is
// selected, the request is sent to the /topup-bulk API.
const selectedEmployees = ref([]);
const selectedType = ref(null);
const amount = ref(null);

// Current budgets for all employees and welfare types. Each item
// includes employeeCode, employeeName, typeId, typeName, limit,
// used and remaining fields.
const budgets = ref([]);

// Budget filtering state
const filterTypeId = ref(null);
const budgetSearch = ref("");

// Compute filtered budgets based on selected type and search term
const filteredBudgets = computed(() => {
  let list = budgets.value;
  if (filterTypeId.value) {
    list = list.filter((b) => b.typeId === filterTypeId.value);
  }
  const term = budgetSearch.value?.toLowerCase();
  if (term) {
    list = list.filter(
      (b) =>
        (b.employeeCode && b.employeeCode.toLowerCase().includes(term)) ||
        (b.employeeName && b.employeeName.toLowerCase().includes(term))
    );
  }
  return list;
});

// Table headers for displaying budgets.
const headers = [
  { title: "ID Card", value: "id_code" },
  { title: "ชื่อ‑สกุล", value: "employeeName" },
  { title: "ประเภทสวัสดิการ", value: "typeName" },
  { title: "ประเภทบุคลากร", value: "emp_type" },
  { title: "วงเงินรวม", value: "limit" },
  { title: "เบิกมาแล้ว", value: "used" },
  { title: "คงเหลือ", value: "remaining" },
];

// Determine if the top‑up button should be enabled. Requires an
// employee, welfare type and a positive amount.
const canTopup = computed(() => {
  return (
    selectedEmployees.value.length > 0 && selectedType.value && amount.value > 0
  );
});

// Load employees from the API. Each employee record has a code and
// a name.
async function fetchEmployees() {
  try {
    const { data } = await http.get("/benefits/employees");
    employees.value = data.employees || [];
  } catch (_err) {
    employees.value = [];
  }
}

// Load welfare types from the API.
async function fetchTypes() {
  try {
    const { data } = await http.get("/benefits/types");
    types.value = data.types || [];
  } catch (_err) {
    types.value = [];
  }
}

// Load all budgets from the API. Optionally filter by typeId if
// needed. Only superadmins and staff may call this endpoint.
async function fetchBudgets() {
  try {
    const { data } = await http.get("/benefits/budgets");
    budgets.value = data.budgets || [];
  } catch (_err) {
    budgets.value = [];
  }
}

// Send a top‑up request to the API. On success, refresh the budgets
// and clear the form.
async function submitTopup() {
  if (!canTopup.value) return;
  try {
    const body = {
      typeId: selectedType.value,
      add: amount.value,
    };
    let url;
    if (selectedEmployees.value.length === 1) {
      // Single employee top‑up uses the existing endpoint
      body.employeeCode = selectedEmployees.value[0];
      url = "/benefits/topup";
    } else {
      // Multiple employees top‑up uses the bulk endpoint
      body.employeeCodes = selectedEmployees.value;
      url = "/benefits/topup-bulk";
    }
    await http.post(url, body);
    alert("ปรับวงเงินเรียบร้อย");
    // Reload budgets to reflect the new limit and remaining values.
    await fetchBudgets();
  } catch (err) {
    const msg = err?.response?.data?.message || "ไม่สามารถปรับวงเงินได้";
    alert(msg);
  }
  selectedEmployees.value = [];
  selectedType.value = null;
  amount.value = null;
}

// Load initial data when the component mounts.
onMounted(() => {
  fetchEmployees();
  fetchTypes();
  fetchBudgets();
});
</script>

<style scoped>
/* Styles for the year settings page can go here. */
</style>
