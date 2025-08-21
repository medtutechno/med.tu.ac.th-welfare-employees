<template>
  <v-card class="px-2 py-2">
    <!-- ห่อด้วย card เพื่อทำแนวนอนเลื่อนได้ -->
    <div class="table-x-scroll">
      <v-data-table
        :headers="headers"
        :items="items"
        :items-per-page="itemsPerPage"
        class="no-wrap"
        v-bind="$attrs"
      />
    </div>
  </v-card>
</template>

<script setup>
const props = defineProps({
  headers: { type: Array, required: true },
  items: { type: Array, required: true },
  itemsPerPage: { type: Number, default: 5 },
});
</script>

<style scoped>
/* กล่องหุ้มให้เลื่อนแกน X */
.table-x-scroll {
  overflow-x: auto; /* แสดงสกอลล์บาร์แกน X */
}

/* เจาะ DOM ภายใน v-data-table */
:deep(.no-wrap .v-table__wrapper) {
  overflow-x: visible; /* ให้ wrapper ไม่บังการขยายความกว้างของ table */
}

/* ให้ table กว้างเท่าคอนเทนต์จริง -> ถ้ากว้างเกิน wrapper จะเลื่อน X ได้ */
:deep(.no-wrap table.v-table) {
  width: max-content; /* สำคัญมาก */
  table-layout: auto;
}

/* ไม่ให้หัวตารางและข้อมูลตัดบรรทัด */
:deep(.no-wrap th),
:deep(.no-wrap td),
:deep(.no-wrap .v-data-table-header__content) {
  white-space: nowrap;
}

/* ถ้าต้องการให้ cell เกินความกว้างมี ... ให้ระบุความกว้างคอลัมน์เองก่อน
:deep(.no-wrap td) {
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px; 
}
*/
</style>
