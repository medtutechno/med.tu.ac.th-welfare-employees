<template>
  <v-container>
    <v-card class="pa-4">
      <v-card-title>รายงานยอดสวัสดิการ</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="4">
            <!-- Dropdown to filter by welfare type. -->
            <v-select
              v-model="selectedType"
              :items="filteredTypes"
              label="เลือกประเภทสวัสดิการ"
              item-title="name"
              item-value="id"
              clearable
            />
          </v-col>
          <v-col cols="12" sm="4">
            <!-- Search box to filter by employee code, name or type name -->
            <v-text-field
              v-model="searchTerm"
              label="ค้นหารายการ (ชื่อ, รหัส, ประเภท)"
              clearable
              hide-details
            />
          </v-col>
        </v-row>
        <v-data-table
          :headers="headers"
          :items="filteredBudgets"
          :items-per-page="5"
          class="mt-4"
        ></v-data-table>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { currentUser } from "../stores/auth.js";
import http from "../api/http.js";

// Selected welfare type id for filtering
const selectedType = ref(null);
const searchTerm = ref("");

// Available welfare types fetched from the API
const types = ref([]);

// Filter welfare types based on staff assignments. Superadmins see all types.
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

// Budgets returned from the API. Each budget includes employeeCode,
// employeeName, typeId, typeName, limit, used and remaining.
const budgets = ref([]);

// Table headers for the report. These correspond to fields on the budget
// objects returned by the API.
const headers = [
  { title: "หมายเลขบัตรประชาชน", value: "id_code" },
  { title: "รหัสพนักงาน", value: "employeeCode" },
  { title: "ชื่อ‑สกุล", value: "employeeName" },
  { title: "ประเภทสวัสดิการ", value: "typeName" },
  { title: "ประเภทบุคลากร", value: "emp_type" },
  { title: "วงเงิน", value: "limit" },
  { title: "ใช้ไป", value: "used" },
  { title: "คงเหลือ", value: "remaining" },
];

// Filter budgets based on the selected type. If no type selected, show
// all budgets.
const filteredBudgets = computed(() => {
  // Filter by type if selected
  let list = budgets.value;
  if (selectedType.value) {
    list = list.filter((b) => b.typeId === selectedType.value);
  }
  // Filter by search term (employee code, name or type name)
  const term = searchTerm.value?.toString().toLowerCase().trim();
  if (term) {
    return list.filter((b) => {
      return (
        b.employeeCode.toLowerCase().includes(term) ||
        b.employeeName.toLowerCase().includes(term) ||
        b.typeName.toLowerCase().includes(term)
      );
    });
  }
  return list;
});

/**
 * Fetch all welfare types from the API. Types are used to populate the
 * select control for filtering. Errors are silently ignored.
 */
async function fetchTypes() {
  try {
    const { data } = await http.get("/benefits/types");
    types.value = data.types || [];
  } catch (_err) {
    types.value = [];
  }
}

/**
 * Fetch the budgets for all employees and welfare types. Optionally
 * filter by a specific type ID. Budgets are returned as an array of
 * objects. Errors are silently ignored.
 */
async function fetchBudgets() {
  try {
    const params = {};
    if (selectedType.value) params.typeId = selectedType.value;
    const { data } = await http.get("/benefits/budgets", { params });
    budgets.value = data.budgets || [];
  } catch (_err) {
    budgets.value = [];
  }
}

// Load types and budgets on initial mount. Also watch the selected
// type and reload budgets when it changes.
onMounted(() => {
  fetchTypes();
  fetchBudgets();
});
watch(selectedType, () => {
  fetchBudgets();
});
</script>

<style scoped>
/* Add styles specific to the reports page if needed. */
</style>
