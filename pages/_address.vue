<template>
  <v-row>
    <v-col></v-col>
  </v-row>
</template>

<script>
export default {
  asyncData({ params }) {
    const address = params.address
    return { address }
  },
}
</script>