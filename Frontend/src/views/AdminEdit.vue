<template>
  <v-container>
    <v-card class="pa-4">
      <v-card-title>เบิก/แก้ไขยอดสวัสดิการ</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="4">
            <v-select
              v-model="selectedEmployee"
              :items="employees"
              item-title="name"
              item-value="code"
              label="พนักงาน"
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
              :disabled="!selectedEmployee"
              clearable
            />
          </v-col>
        </v-row>
        <div v-if="budget">
          <p>วงเงินประจำปี: {{ budget.limit }} บาท</p>
          <p>ใช้ไปแล้ว: {{ budget.used }} บาท</p>
          <p>คงเหลือ: {{ remaining }} บาท</p>
          <v-divider :thickness="1" color="success" class="my-4"></v-divider>
          <v-text-field
            v-model.number="amount"
            label="จำนวนเงินที่ต้องการเบิก"
            type="number"
            :rules="[(v) => v <= remaining || 'เกินวงเงิน']"
          />
          <v-select
            v-model="selectedClaimFor"
            :items="claimFor"
            label="เบิกให้กับ"
            :disabled="!selectedType"
            clearable
          ></v-select>
          <!-- Description input for the claim -->
          <v-text-field
            v-model="description"
            label="รายละเอียดการเบิก (เช่น เบิกค่ารักษาพยาบาล)"
            class="mt-3"
          />

          <v-btn
            color="primary"
            class="mt-3"
            @click="submitClaim"
            :disabled="!canSubmit"
            >บันทึกการเบิก</v-btn
          >
        </div>
        <div v-else-if="selectedEmployee && selectedType">
          <p class="text-error">
            ยังไม่ได้ตั้งค่าวงเงินสำหรับพนักงานคนนี้และประเภทนี้
          </p>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { currentUser } from "../stores/auth.js";
import http from "../api/http.js";

// List of employees fetched from the API. Each item should include
// a "code" property for the employee code and a "name" for display.
const employees = ref([]);

// List of welfare types fetched from the API.
const types = ref([]);

// Defined list of Claim for who ?
const claimFor = ref(["ตนเอง", "บิดา", "มารดา", "บุตร"]);

// Filter welfare types based on staff assignments. Superadmins see all types,
// staff see only their assigned types. General users cannot access this page.
const filteredTypes = computed(() => {
  const user = currentUser.value;
  // Return all types if no user (should not happen) or if superadmin
  if (!user) return types.value;
  const roles = Array.isArray(user.roles) ? user.roles : [user.role];
  if (roles.includes("superadmin")) return types.value;
  if (roles.includes("staff")) {
    const assignments = user.staffAssignments || [];
    return types.value.filter((t) => assignments.includes(t.id));
  }
  return [];
});

// Selected employee code and welfare type id.
const selectedEmployee = ref("");
const selectedType = ref(null);
const selectedClaimFor = ref(null);

// Amount the admin wants to claim for the selected employee/type.
const amount = ref(0);
// Description for the claim
const description = ref("");

// Balances for the selected employee. Each balance includes typeId,
// typeName, limit, used and remaining fields. This is populated by
// calling the /benefits/balances endpoint.
const balances = ref([]);

// The current budget for the selected welfare type. Computed by
// finding the balance record with the matching typeId. Returns
// undefined if no record exists.
const budget = computed(() => {
  if (!selectedType.value) return null;
  return balances.value.find((b) => b.typeId === selectedType.value) || null;
});

const selectedIdcode = computed(() => {
  if (!selectedEmployee.value) return null;
  return employees.value.find((b) => b.code === selectedEmployee.value) || null;
});

// Remaining balance for the selected type. If no budget exists,
// remaining is zero.
const remaining = computed(() => {
  return budget.value ? budget.value.remaining : 0;
});

// Whether the claim can be submitted. Must have a selected employee,
// type and amount greater than zero and not exceeding the remaining
// balance.
const canSubmit = computed(() => {
  return (
    selectedEmployee.value &&
    selectedType.value &&
    amount.value > 0 &&
    amount.value <= remaining.value
  );
});

// Fetch the list of employees from the API. Results are stored in
// the employees ref. Errors are silently swallowed.
async function fetchEmployees() {
  try {
    const { data } = await http.get("/benefits/employees");
    employees.value = data.employees || [];
  } catch (_err) {
    employees.value = [];
  }
}

// Fetch the list of welfare types from the API.
async function fetchTypes() {
  try {
    const { data } = await http.get("/benefits/types");
    types.value = data.types || [];
  } catch (_err) {
    types.value = [];
  }
}

// Fetch the balances for the selected employee. If no employee is
// selected, clear the balances list. Errors are silently swallowed.
async function fetchBalances() {
  if (!selectedEmployee.value) {
    balances.value = [];
    return;
  }
  try {
    const { data } = await http.get("/benefits/balances", {
      params: { employeeCode: selectedEmployee.value },
    });
    balances.value = data.balances || [];
  } catch (_err) {
    balances.value = [];
  }
}

// Watch for changes to the selected employee and load balances when
// it changes. Also clear the selected type and amount when switching
// employees.
watch(selectedEmployee, () => {
  selectedType.value = null;
  amount.value = 0;
  fetchBalances();
});

// Initial data fetch when the component mounts.
onMounted(() => {
  fetchEmployees();
  fetchTypes();
});

// Submit the claim via the API. Only runs if canSubmit is true. On
// success, refresh the balances and reset the amount. Any error
// returns an alert with the error message.
async function submitClaim() {
  if (!canSubmit.value) return;
  try {
    await http.post("/benefits/claim", {
      id_code: selectedIdcode.value.id_code,
      employeeCode: selectedEmployee.value,
      typeId: selectedType.value,
      amount: amount.value,
      claimfor: selectedClaimFor.value,
      description: description.value,
    });
    alert("บันทึกการเบิกเรียบร้อย");
    amount.value = 0;
    description.value = "";
    // Reload balances to reflect the new used and remaining values.
    fetchBalances();
  } catch (err) {
    const msg = err?.response?.data?.message || "เกิดข้อผิดพลาด";
    alert(msg);
  }
}
</script>

<style scoped>
.text-error {
  color: red;
}
</style>
