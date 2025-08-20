<template>
  <v-container>
    <v-card class="pa-4">
      <v-card-title>ตั้งค่าประเภทสวัสดิการ</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="6">
            <v-text-field v-model="newCategory" label="ชื่อประเภทใหม่" />
          </v-col>
          <v-col cols="12" sm="2" class="d-flex align-end">
            <v-btn color="primary" @click="addCategory">เพิ่ม</v-btn>
          </v-col>
        </v-row>
        <v-data-table
          :headers="headers"
          :items="categories"
          class="mt-4"
          density="compact"
        >
          <template #item.actions="{ item }">
            <v-btn icon="mdi-delete" color="red" @click="deleteCategory(item)"></v-btn>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import http from '../api/http.js';

// List of categories loaded from the API.
const categories = ref([]);
// Name of the new category to add.
const newCategory = ref('');

// Table headers for the categories list.
const headers = [
  { title: 'ชื่อประเภท', value: 'name' },
  { title: '', value: 'actions', sortable: false },
];

// Fetch all categories (welfare types) from the API.
async function fetchCategories() {
  try {
    const { data } = await http.get('/benefits/types');
    categories.value = data.types || [];
  } catch (_err) {
    categories.value = [];
  }
}

// Add a new category by sending a POST to the API. Only
// superadmins may call this endpoint. On success, refresh the list.
async function addCategory() {
  if (!newCategory.value) return;
  try {
    await http.post('/benefits/types', { name: newCategory.value });
    newCategory.value = '';
    await fetchCategories();
  } catch (err) {
    const msg = err?.response?.data?.message || 'ไม่สามารถเพิ่มประเภทได้';
    alert(msg);
  }
}

// Delete a category by sending a DELETE to the API. On success,
// refresh the list.
async function deleteCategory(item) {
  try {
    await http.delete(`/benefits/types/${item.id}`);
    await fetchCategories();
  } catch (err) {
    const msg = err?.response?.data?.message || 'ไม่สามารถลบประเภทได้';
    alert(msg);
  }
}

// Load the categories when the component mounts.
onMounted(() => {
  fetchCategories();
});
</script>

<style scoped>
/* Styles for the categories settings page can go here. */
</style>