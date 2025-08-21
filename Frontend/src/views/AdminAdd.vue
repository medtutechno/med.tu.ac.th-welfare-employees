<template>
  <v-container>
    <!-- Form to add a single welfare budget. -->
    <v-card class="pa-4 mb-4">
      <v-card-title>เพิ่มวงเงินสวัสดิการ (ทีละรายการ)</v-card-title>
      <v-card-text>
        <v-row>
          <!-- Input employee code and search button -->
          <v-col cols="12" sm="4">
            <v-text-field
              v-model="searchCode"
              label="รหัสพนักงาน (MEDCODE)"
              clearable
            />
          </v-col>
          <v-col cols="12" sm="2" class="d-flex align-end">
            <v-btn color="secondary" @click="lookupEmployee">ค้นหา</v-btn>
          </v-col>
        </v-row>
        <!-- Display employee details when loaded -->
        <div v-if="employeeDetails">
          <p>รหัสบัตรประชาชน: {{ employeeDetails.id_code }}</p>
          <p>รหัสพนักงาน: {{ employeeDetails.employee_code }}</p>
          <p>ชื่อ: {{ employeeDetails.fname }} {{ employeeDetails.lname }}</p>
          <p>รหัสตำแหน่ง: {{ employeeDetails.employee_position_number }}</p>
          <p>หน่วยงาน: {{ employeeDetails.department }}</p>
          <p>ประเภทพนักงาน: {{ employeeDetails.emp_type }}</p>
        </div>
        <v-row>
          <v-col cols="12" sm="4">
            <v-select
              v-model="selectedType"
              :items="types"
              item-title="name"
              item-value="id"
              label="ประเภทสวัสดิการ"
              :disabled="!employeeDetails"
              clearable
            />
          </v-col>
          <v-col cols="12" sm="4">
            <v-text-field
              v-model.number="limit"
              label="จำนวนเงิน"
              type="number"
              suffix="บาท"
              :disabled="!employeeDetails"
            />
          </v-col>
        </v-row>
        <v-btn
          color="primary"
          :loading="loadingSave"
          @click="saveBudget"
          :disabled="!canSave"
        >
          <span v-if="loadingSave"> กำลังบันทึก... </span>
          <span v-else> บันทึก </span>
        </v-btn>
      </v-card-text>
    </v-card>
    <!-- Section to import budgets from an Excel file. -->
    <v-card class="pa-4">
      <v-card-title>นำเข้าจาก Excel</v-card-title>
      <v-card-text>
        <v-file-input
          v-model="excelFile"
          accept=".xlsx"
          label="เลือกไฟล์ Excel"
        />
        <div class="mt-2">
          <small>
            ไฟล์ควรมีคอลัมน์: id_code,employee_code, fname, lname,
            employee_position_number, department, emp_type, typeId, limit
          </small>
        </div>
        <v-btn class="mt-4" color="primary" @click="importExcel">นำเข้า</v-btn>
        <!-- Link to download an example Excel file with the required columns -->
        <div class="mt-2">
          <a href="/exampledata.xlsx" download>ดาวน์โหลดไฟล์ Excel ตัวอย่าง</a>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import * as XLSX from "xlsx";
import http from "../api/http.js";

// List of welfare types fetched from the API.
const types = ref([]);

// Form fields for creating a single budget. We allow the admin to
// look up an employee by MEDCODE via the external API and display
// their details. After lookup, the admin chooses a welfare type and
// specifies the initial limit for that type.
const searchCode = ref("");
const employeeDetails = ref(null);
const selectedType = ref(null);
const limit = ref(null);
const excelFile = ref(null);

const loadingSave = ref(false);

/**
 * Fetch employees and types from the API. These functions are called
 * when the component is mounted. Errors are silently ignored.
 */
async function fetchTypes() {
  try {
    const { data } = await http.get("/benefits/types");
    types.value = data.types || [];
  } catch (_err) {
    types.value = [];
  }
}

onMounted(() => {
  fetchTypes();
});

// Look up an employee by code via the API. The API responds with
// employee details (employee_code, fname, lname, employee_position_number,
// department, emp_type). On success, store the details for use when
// creating a budget. On failure, clear the details and alert the user.
async function lookupEmployee() {
  const code = searchCode.value?.trim();
  if (!code) {
    alert("กรุณากรอกรหัสพนักงาน");
    return;
  }
  try {
    const { data } = await http.get(
      `/benefits/employee/${encodeURIComponent(code)}`
    );
    console.log(data);
    employeeDetails.value = data.employee;
    // Reset type and limit when a new employee is loaded
    selectedType.value = null;
    limit.value = null;
  } catch (err) {
    employeeDetails.value = null;
    const msg = err?.response?.data?.message || "ไม่พบข้อมูลพนักงาน";
    alert(msg);
  }
}

// Whether the admin can save the budget. Requires employeeDetails,
// selected welfare type and a positive limit amount.
const canSave = computed(() => {
  return (
    employeeDetails.value &&
    selectedType.value &&
    limit.value &&
    Number(limit.value) > 0
  );
});

/**
 * Submit a single budget entry. This calls the back‑end to increase the
 * existing budget (top‑up) for the selected employee and welfare type.
 * If no budget exists yet, the API will return an error. Consider
 * enhancing the back‑end to create a budget row when none exists.
 */

// Save a new budget for the looked‑up employee. Calls the /benefits/budget
// endpoint with the employee details, selected welfare type and limit.

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function saveBudget() {
  if (!canSave.value) return;
  loadingSave.value = true;
  await delay(1500);

  try {
    const payload = {
      id_code: employeeDetails.value.id_code,
      employee_code: employeeDetails.value.employee_code,
      fname: employeeDetails.value.fname,
      lname: employeeDetails.value.lname,
      employee_position_number: employeeDetails.value.employee_position_number,
      department: employeeDetails.value.department,
      emp_type: employeeDetails.value.emp_type,
      typeId: selectedType.value,
      limit: limit.value,
    };
    await http.post("/benefits/budget", payload);
    alert("บันทึกวงเงินสำเร็จ");
    // Reset fields after success
    searchCode.value = "";
    employeeDetails.value = null;
    selectedType.value = null;
    limit.value = null;
    loadingSave.value = false;
  } catch (err) {
    const msg = err?.response?.data?.message || "ไม่สามารถบันทึกวงเงินได้";
    loadingSave.value = false;
    alert(msg);
  }
}

/**
 * Import budgets from an Excel file. Each row in the sheet should
 * include `employeeCode`, `typeId`, `year` and `limit` fields. For
 * simplicity this example only reads the data and does not send it to
 * the server. You could iterate over the rows and call the API for
 * each one.
 */
function importExcel() {
  if (!excelFile.value) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet);
    console.log("Imported data", json);
    alert("นำเข้าข้อมูลแล้ว " + json.length + " รายการ");
    // TODO: Send each row to the server via POST /benefits/topup or a new API.
  };
  reader.readAsArrayBuffer(excelFile.value);
}
</script>

<style scoped>
/* Add styles specific to the add page if needed. */
</style>
