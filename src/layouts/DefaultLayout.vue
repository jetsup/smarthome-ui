<template>
  <div class="default-layout">
    <NavBar />
    <main>
      <router-view />
    </main>
    <FooterBar />
  </div>
</template>

<script setup>
import NavBar from '../components/NavBar.vue'
import FooterBar from '../components/FooterBar.vue'
</script>

<style scoped>
.default-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

main {
  flex: 1;
}
</style>
