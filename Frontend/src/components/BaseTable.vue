<template>
  <v-data-table
    :headers="headers"
    :items="items"
    :items-per-page="itemsPerPage"
    class="mb-4"
    v-bind="$attrs"
  />
</template>

<script setup>
// A simple reusable table component that wraps Vuetify's v-data-table. It
// accepts headers and items as props and forwards any additional
// attributes to the underlying table.
const props = defineProps({
  headers: { type: Array, required: true },
  items: { type: Array, required: true },
  itemsPerPage: { type: Number, default: 5 },
});
</script>

<style scoped>
/* Optional scoped styles for the base table */
</style>