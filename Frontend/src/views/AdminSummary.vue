<template>
  <v-container fluid>
    <!-- Top row of metrics cards -->
    <v-row>
      <v-col cols="12" sm="6" md="3" v-for="card in metricCards" :key="card.title">
        <v-card class="pa-4 d-flex align-center card-metric" elevation="1">
          <v-avatar size="48" class="mr-4" color="primary">
            <v-icon color="white">{{ card.icon }}</v-icon>
          </v-avatar>
          <div>
            <div class="text-h5 font-weight-bold">{{ card.value.toLocaleString() }}</div>
            <div class="text-caption">{{ card.title }}</div>
          </div>
        </v-card>
      </v-col>
    </v-row>
    <!-- Second row: summary table and trending list -->
    <v-row>
      <v-col cols="12" md="8">
        <v-card elevation="2" class="pa-4">
          <v-card-title class="pb-0">สรุปยอดการเบิกสวัสดิการ</v-card-title>
          <v-card-subtitle class="pb-4">
            
          </v-card-subtitle>
          <!-- Year selector allows the administrator to choose which year to summarise. -->
          <v-row class="mb-4">
            <v-col cols="12" sm="4">
              <v-select
                v-model="year"
                :items="yearOptions"
                label="ปี"
                clearable
              />
            </v-col>
          </v-row>
          <!-- Use the reusable BaseTable component to display the summary. -->
          <BaseTable
            :headers="headers"
            :items="summary"
            :loading="loading"
            class="mt-2"
          />
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card elevation="2" class="pa-4">
          <v-card-title class="pb-0">ประเภทสวัสดิการยอดนิยม</v-card-title>
          <v-card-subtitle class="pb-4">ดูยอดเบิกสูงสุด</v-card-subtitle>
          <v-list density="comfortable">
            <v-list-item
              v-for="item in trending"
              :key="item.typeName"
              class="px-0"
            >
              <div class="w-100">
                <div class="d-flex justify-space-between">
                  <span>{{ item.typeName }}</span>
                  <span>{{ item.total.toLocaleString() }} บาท</span>
                </div>
                <v-progress-linear
                  :value="maxTrend > 0 ? (item.total / maxTrend) * 100 : 0"
                  height="6"
                  color="primary"
                  class="mt-1"
                ></v-progress-linear>
              </div>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import http from '../api/http.js';
import BaseTable from '../components/BaseTable.vue';

// Set up the current year and a list of the last 5 years for the select.
const currentYear = new Date().getFullYear();
const year = ref(currentYear);
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

// State for summary data, metrics and trending categories
const summary = ref([]);
const trending = ref([]);
const loading = ref(false);
const metrics = ref({
  totalEmployees: 0,
  totalTypes: 0,
  totalBudgets: 0,
  totalAmount: 0,
});

// Headers for the summary table
const headers = [
  { title: 'ประเภทสวัสดิการ', value: 'typeName' },
  { title: 'ยอดรวม (บาท)', value: 'total' },
];

// Cards configuration for the top metrics. Each card defines the icon,
// title and a reactive getter for its value. Icons use the mdi prefix.
const metricCards = computed(() => [
  {
    icon: 'mdi-account-multiple',
    title: 'พนักงานทั้งหมด',
    value: metrics.value.totalEmployees,
  },
  {
    icon: 'mdi-format-list-bulleted',
    title: 'ประเภทสวัสดิการ',
    value: metrics.value.totalTypes,
  },
  {
    icon: 'mdi-wallet',
    title: 'วงเงินทั้งหมด',
    value: metrics.value.totalBudgets,
  },
  {
    icon: 'mdi-cash',
    title: 'ยอดเบิกรวม (บาท)',
    value: metrics.value.totalAmount,
  },
]);

// Compute the maximum total among trending categories for progress bars
const maxTrend = computed(() => {
  return trending.value.reduce((max, item) => Math.max(max, item.total), 0);
});

/**
 * Fetch summary and related metrics from the API. This function
 * retrieves the summary for the selected year and additionally loads
 * the list of employees, welfare types and budgets to compute
 * dashboard metrics. It also prepares the trending list by taking the
 * top 5 welfare types sorted by their total claim amounts.
 */
async function fetchSummaryAndMetrics() {
  loading.value = true;
  try {
    // Fetch summary, types, employees and budgets concurrently
    const [summaryRes, typesRes, employeesRes, budgetsRes] = await Promise.all([
      http.get('/benefits/summary', { params: { year: year.value } }),
      http.get('/benefits/types'),
      http.get('/benefits/employees'),
      http.get('/benefits/budgets'),
    ]);
    // Prepare summary table rows
    const summaryData = summaryRes.data.summary || [];
    summary.value = summaryData.map(item => ({
      typeName: item.typeName,
      total: item.total.toLocaleString(),
    }));
    // Update metrics
    metrics.value.totalEmployees = employeesRes.data.employees ? employeesRes.data.employees.length : 0;
    metrics.value.totalTypes = typesRes.data.types ? typesRes.data.types.length : 0;
    metrics.value.totalBudgets = budgetsRes.data.budgets ? budgetsRes.data.budgets.length : 0;
    metrics.value.totalAmount = summaryData.reduce((sum, item) => sum + item.total, 0);
    // Prepare trending list (top 5 by total amount)
    const sorted = summaryData.slice().sort((a, b) => b.total - a.total);
    trending.value = sorted.slice(0, 5).map(item => ({
      typeName: item.typeName,
      total: item.total,
    }));
  } catch (_err) {
    // Reset values on error
    summary.value = [];
    metrics.value.totalEmployees = 0;
    metrics.value.totalTypes = 0;
    metrics.value.totalBudgets = 0;
    metrics.value.totalAmount = 0;
    trending.value = [];
  } finally {
    loading.value = false;
  }
}

// Load data on mount and whenever the year changes
onMounted(() => {
  fetchSummaryAndMetrics();
});
watch(year, () => {
  fetchSummaryAndMetrics();
});
</script>

<style scoped>
/* You can add scoped styles here to customise the appearance of the summary page. */
.card-metric {
  background-color: #f5f7fb;
  border-radius: 8px;
}
</style>