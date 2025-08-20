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
          <v-col cols="12" sm="3">
            <v-btn color="primary" @click="doSearch" :loading="loading" prepend-icon="mdi-magnify">ค้นหา</v-btn>
          </v-col>
        </v-row>
        <!-- Display result count or no data message after a search -->
        <div v-if="searched && !loading">
          <div v-if="results.length > 0" class="mb-2">พบ {{ results.length }} รายการ</div>
          <div v-else class="mb-2">ไม่พบข้อมูล</div>
        </div>
        <v-data-table
          :headers="headers"
          :items="results"
          :items-per-page="10"
          class="mt-2"
          :loading="loading"
          loading-text="กำลังค้นหา..."
        ></v-data-table>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref } from 'vue';
import http from '../api/http.js';

// Search fields bound to the form inputs.
const employeeCode = ref('');
const name = ref('');
const dateFrom = ref('');
const dateTo = ref('');

// Results returned from the API.
const results = ref([]);
const loading = ref(false);
// Flag to indicate that a search has been performed. Used to show
// messages when no results are returned.
const searched = ref(false);

// Table headers for the search results. Includes employee code, full name, welfare type, amount and date.
const headers = [
  { title: 'วันที่', value: 'date' },
  { title: 'รหัสพนักงาน', value: 'employeeCode' },
  { title: 'ชื่อ‑สกุล', value: 'fullName' },
  { title: 'ประเภท', value: 'typeName' },
  { title: 'จำนวนเงิน', value: 'amount' },
  { title: 'รายละเอียด', value: 'description' },
];

/**
 * Perform a search using the API based on the current form values. Only
 * parameters with values are sent to the server. The API returns an
 * array of results or an empty array. Errors are silently ignored.
 */
async function doSearch() {
  loading.value = true;
  try {
    const params = {};
    if (employeeCode.value) params.employeeCode = employeeCode.value;
    if (name.value) params.name = name.value;
    if (dateFrom.value) params.dateFrom = dateFrom.value;
    if (dateTo.value) params.dateTo = dateTo.value;
    const { data } = await http.get('/benefits/search', { params });
    results.value = data.results || [];
    searched.value = true;
  } catch (_err) {
    results.value = [];
    searched.value = true;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
/* Add any scoped styles specific to the search page here. */
</style>