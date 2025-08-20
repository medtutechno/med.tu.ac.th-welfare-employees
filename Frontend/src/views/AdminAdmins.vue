<template>
  <v-container>
    <v-card class="pa-4">
      <v-card-title>ตั้งค่าผู้ดูแลแต่ละสวัสดิการ</v-card-title>
      <v-card-text>
        <!-- Form to add a new manager assignment -->
        <v-row class="mb-4">
          <v-col cols="6">
            <v-select
              v-model="selectedTypeId"
              :items="types"
              item-title="name"
              item-value="id"
              label="ประเภทสวัสดิการ"
              clearable
            />
          </v-col>
          <v-col cols="4">
            <!-- Search field for staff code (MEDCODE) to add as a new admin -->
            <v-text-field
              v-model="searchStaffCode"
              label="รหัสพนักงานผู้ดูแล"
              clearable
            />
          </v-col>
          <v-col cols="12" sm="2" class="d-flex align-end">
            <v-btn color="secondary" @click="lookupStaff">ค้นหา</v-btn>
          </v-col>
          <!-- Display staff details after lookup. This helps the admin confirm
             that the correct employee has been selected before assigning. -->
          <v-row v-if="staffDetails">
            <v-col cols="12">
              <v-card class="mb-4">
                <v-card-title>ข้อมูลพนักงานที่ค้นหา</v-card-title>
                <v-card-text>
                  <p>รหัสพนักงาน: {{ staffDetails.employee_code }}</p>
                  <p>ชื่อ: {{ staffDetails.fname }} {{ staffDetails.lname }}</p>
                  <p>หน่วยงาน: {{ staffDetails.department }}</p>
                  <p>ประเภทพนักงาน: {{ staffDetails.emp_type }}</p>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
          <v-col cols="12" sm="2" class="d-flex align-end">
            <v-btn
              color="primary"
              @click="addAdminBySearch"
              :disabled="!canAddBySearch"
            >
              เพิ่มผู้ดูแล
            </v-btn>
          </v-col>
          <v-col cols="12">
            <!-- Dropdown to select an existing user (optional) -->
            <v-select
              v-model="selectedUserId"
              :items="users"
              item-title="username"
              item-value="id"
              label="เลือกผู้ดูแล (จากระบบ)"
              clearable
            />
          </v-col>
          <v-col cols="12" class="d-flex align-end w-100">
            <v-btn color="primary" @click="addAdmin" :disabled="!canAdd">
              เพิ่มจากผู้ใช้งานสร้างเอง
            </v-btn>
          </v-col>
        </v-row>

        {{ assignments }}
        <v-data-table
          :headers="headers"
          :items="assignments"
          class="mt-4"
          :items-per-page="5"
        >
          <template #item.actions="{ item }">
            <v-btn icon @click="removeAssignment(item)">
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import http from "../api/http.js";

// Lists of welfare types and users loaded from the API.
const types = ref([]);
const users = ref([]);

// Current assignments loaded from the API. Each assignment contains
// userId, typeId, typeName and admin (username).
const assignments = ref([]);

// Selected type and user IDs for adding a new assignment.
const selectedTypeId = ref(null);
const selectedUserId = ref(null);

// Search field and details for adding a new staff admin by MEDCODE.
const searchStaffCode = ref("");
const staffDetails = ref(null);

// Table headers. userId is not displayed but needed for removal.
const headers = [
  { title: "ประเภทสวัสดิการ", value: "typeName" },
  { title: "ผู้ดูแล", value: "userId" },
  { title: "", value: "actions", sortable: false },
];

// Determine if the form can add a new admin. Requires both type and
// user selections.
const canAdd = computed(() => {
  return selectedTypeId.value && selectedUserId.value;
});

// Determine if we can add an admin by searching. Requires a type
// selection and loaded staff details.
const canAddBySearch = computed(() => {
  return selectedTypeId.value && staffDetails.value;
});

// Fetch welfare types from the API.
async function fetchTypes() {
  try {
    const { data } = await http.get("/benefits/types");
    types.value = data.types || [];
  } catch (_err) {
    types.value = [];
  }
}

// Fetch users from the API. Only superadmin may call this endpoint.
async function fetchUsers() {
  try {
    const { data } = await http.get("/users");
    // Expect data.users array with id, username, role, etc.
    users.value = data.users || [];
  } catch (_err) {
    users.value = [];
  }
}

// Fetch assignments from the API.
async function fetchAssignments() {
  try {
    const { data } = await http.get("/benefits/admins");
    assignments.value = data.admins || [];
  } catch (_err) {
    assignments.value = [];
  }
}

// Add a new admin assignment. Sends the userId and typeId to the API.
async function addAdmin() {
  if (!canAdd.value) return;

  try {
    await http.post("/benefits/admins", {
      userCode: staffDetails.value.employee_code,
      typeId: selectedTypeId.value,
    });
    // Refresh assignments after adding.
    await fetchAssignments();
    selectedUserId.value = null;
    selectedTypeId.value = null;
  } catch (err) {
    const msg = err?.response?.data?.message || "ไม่สามารถเพิ่มผู้ดูแลได้";
    alert(msg);
  }
}

// Look up an employee to be assigned as staff using the external API. This
// function is called when the admin clicks the search button. On success
// the details are stored in staffDetails. On failure, an alert is shown.
async function lookupStaff() {
  const code = searchStaffCode.value?.trim();
  if (!code) {
    alert("กรุณากรอกรหัสพนักงาน");
    return;
  }
  try {
    const { data } = await http.get(
      `/benefits/employee/${encodeURIComponent(code)}`
    );
    staffDetails.value = data.employee;
  } catch (err) {
    staffDetails.value = null;
    const msg = err?.response?.data?.message || "ไม่พบข้อมูลพนักงาน";
    alert(msg);
  }
}

// Add a new admin using the searched staff details. This will create a new
// user account with role "staff" (if it does not already exist) and
// assign the selected welfare type to that user. Only available to
// superadmins. On success, assignments and user lists are refreshed.
async function addAdminBySearch() {
  if (!canAddBySearch.value) return;
  try {
    // Ensure a local user exists for this staff. Use MEDCODE as username.
    const username = staffDetails.value.employee_code;
    // Attempt to create the user. If duplicate, ignore the error.
    // try {
    //   await http.post("/users", {
    //     username,
    //     password: username, // default password equal to MEDCODE
    //     fname: staffDetails.value.fname,
    //     lname: staffDetails.value.lname,
    //     role: "superadmin",
    //   });
    // } catch (createErr) {
    //   // Ignore duplicate username errors
    // }
    // // Reload users to get the id of the newly created user
    // await fetchUsers();
    // // Find the user id by username
    // const user = users.value.find((u) => u.username === username);
    // if (!user) {
    //   throw new Error("ไม่พบผู้ใช้ในระบบ");
    // }
    // Assign this user to the selected type
    await http.post("/benefits/admins", {
      userCode: username,
      typeId: selectedTypeId.value,
    });
    alert("เพิ่มผู้ดูแลเรียบร้อย");
    // Refresh assignments and clear search fields
    await fetchAssignments();
    searchStaffCode.value = "";
    staffDetails.value = null;
    selectedTypeId.value = null;
  } catch (err) {
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      "ไม่สามารถเพิ่มผู้ดูแลได้";
    alert(msg);
  }
}

// Remove an existing assignment via the API.
async function removeAssignment(item) {
  try {
    console.log(item);
    await http.post("/benefits/admins/remove", {
      userId: item.userId,
      typeId: item.typeId,
    });
    await fetchAssignments();
  } catch (err) {
    const msg = err?.response?.data?.message || "ไม่สามารถลบผู้ดูแลได้";
    alert(msg);
  }
}

// Load types, users and assignments when the component mounts.
onMounted(() => {
  fetchTypes();
  fetchUsers();
  fetchAssignments();
});
</script>

<style scoped>
/* Custom styles can be added here if needed */
</style>
