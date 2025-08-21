<template>
  <v-container>
    <v-card class="pa-4">
      <v-card-title>ค้นหาประวัติการเบิกสวัสดิการ</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="3">
            <v-text-field
              v-model="employeeCode"
              label="รหัสพนักงาน"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="3">
            <v-text-field
              v-model="name"
              label="ชื่อหรือสกุล"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="3">
            <v-text-field
              v-model="dateFrom"
              label="จากวันที่"
              type="date"
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="3">
            <v-text-field
              v-model="dateTo"
              label="ถึงวันที่"
              type="date"
              hide-details
            />
          </v-col>
        </v-row>
        <v-row class="mb-4">
          <v-col cols="12" sm="4">
            <v-select
              v-model="selectedType"
              :items="types"
              item-title="name"
              item-value="id"
              label="ประเภทสวัสดิการ"
              clearable
            />
          </v-col>
          <v-col cols="12" sm="3">
            <v-btn
              color="primary"
              @click="doSearch"
              :loading="loading"
              prepend-icon="mdi-magnify"
              >ค้นหา</v-btn
            >
          </v-col>
        </v-row>
        <!-- Display result count or no data message after a search -->
        <!-- <pre>{{ results }}</pre> -->
        <div v-if="searched && !loading">
          <div v-if="results.length > 0" class="mb-2">
            พบ {{ results.length }} รายการ
          </div>
          <div v-else class="mb-2">ไม่พบข้อมูล</div>
        </div>
        <v-data-table
          :headers="headers"
          :items="results"
          :items-per-page="10"
          class="mt-2 no-wrap-headers"
          :loading="loading"
          loading-text="กำลังค้นหา..."
        />
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from "vue";
import http from "../api/http.js";

// Search fields bound to the form inputs.
const employeeCode = ref("");
const name = ref("");
const dateFrom = ref("");
const dateTo = ref("");
const selectedType = ref(null);

// Results returned from the API.
const results = ref([]);
const loading = ref(false);
const types = ref([]);
// Flag to indicate that a search has been performed. Used to show
// messages when no results are returned.
const searched = ref(false);

// Table headers for the search results. Includes employee code, full name, welfare type, amount and date.
const headers = [
  { title: "วันที่", value: "date" },
  { title: "ID Card", value: "id_code" },
  { title: "เลขตำแหน่ง", value: "employee_position_number" },
  { title: "ชื่อ‑สกุล", value: "fullName" },
  { title: "ประเภทบุคลากร", value: "emp_type" },
  { title: "เบิกให้", value: "claimFor" },
  { title: "รายการเบิกตามบัญชี", value: "claimtype_name" },
  { title: "งบประมาณรวม", value: "balance_amount" },
  { title: "เบิกมาแล้ว", value: "total_witdraw_history" },
  { title: "เบิกครั้งนี้", value: "amount" },
  { title: "คงเหลือ", value: "balance_after_witdraw" },
];

/**
 * Perform a search using the API based on the current form values. Only
 * parameters with values are sent to the server. The API returns an
 * array of results or an empty array. Errors are silently ignored.
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function doSearch() {
  loading.value = true;
  await delay(1500);
  try {
    const params = {};
    if (employeeCode.value) params.employeeCode = employeeCode.value;
    if (selectedType.value) params.selectedType = selectedType.value;
    if (name.value) params.name = name.value;
    if (dateFrom.value) params.dateFrom = dateFrom.value;
    if (dateTo.value) params.dateTo = dateTo.value;
    const { data } = await http.get("/benefits/search", { params });
    results.value = data.results || [];
    searched.value = true;
  } catch (_err) {
    results.value = [];
    searched.value = true;
  } finally {
    loading.value = false;
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

onMounted(async () => {
  await fetchTypes();
  console.log(types.value);
});
</script>

<style scoped>
/* Add any scoped styles specific to the search page here. */
/* ให้การ์ด/ตัวห่อเป็นผู้เลื่อนแกน X */
.table-x-scroll {
  overflow-x: auto;
}

/* ปิดสกอลล์แนวนอนของ wrapper ภายใน v-data-table
   เพื่อให้สกอลล์ไปเกิดที่ .table-x-scroll แทน */
:deep(.no-wrap-headers .v-table__wrapper) {
  overflow-x: visible;
}

/* ทำให้ความกว้างของ table เท่ากับเนื้อหาจริง
   ถ้าเกินความกว้างการ์ด -> จะเลื่อน X ได้ */
:deep(.no-wrap-headers table.v-table) {
  width: max-content;
  table-layout: auto; /* อย่า fixed เพื่อให้ขยายตามคอนเทนต์ */
}

/* ไม่ให้ ‘หัวตาราง’ ตัดบรรทัด */
:deep(.no-wrap-headers th),
:deep(td),
:deep(.no-wrap-headers .v-data-table-header__content) {
  white-space: nowrap;
}

/* ถ้าอยากไม่ให้ ‘ข้อมูล’ ตัดบรรทัดด้วย ให้ปลดคอมเมนต์บรรทัดล่าง */
/*
:deep(.no-wrap-headers td) {
  white-space: nowrap;
}
*/
</style>
