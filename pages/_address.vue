<template>
  <v-row>
    <v-col cols="12" md="6" offset-md="3">
      <v-card v-if="loading">
        <v-card-title> Loading... </v-card-title>
      </v-card>
      <v-card v-else class="mx-auto">
        <v-img :src="imgURL"></v-img>

        <v-card-title> {{ name }} </v-card-title>

        <v-card-subtitle> {{ description }} </v-card-subtitle>

        <v-card-actions> </v-card-actions>
      </v-card>
    </v-col>
  </v-row>
</template>

<script>
import { ethers } from 'ethers'
import { toGatewayURL } from 'nft.storage'
import abis from '~/assets/abis'

// const Crypto = require('crypto')

// const apiKey =
// 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweEE5MzRCNGZiNTREOGFCMDk5NzY4NzU5YjU5OWYwYWI5Mjc3NGYyOUMiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTYyODg2MzI5NDA1NywibmFtZSI6ImhhY2tmcyJ9.tzwHSj34yAD_SIju7vqQ2uUgehp73kjNrFcH185ARYg'
// const client = new NFTStorage({ token: apiKey })
export default {
  data() {
    return {
      loading: false,
      name: '',
      description: '',
      imgURL: '',
      lockContract: null,
    }
  },
  asyncData({ params }) {
    const address = params.address

    return { address }
  },
  methods: {
    async loadData() {
      this.loading = true
      this.lockContract = new ethers.Contract(
        this.address,
        abis.PublicLock.abi,
        this.$provider
      )

      const tokenURI = await this.lockContract.tokenURI(1)
      const url = toGatewayURL(tokenURI)
      const res = await fetch(url)
      const metadata = await res.json()

      this.name = metadata.name
      this.description = metadata.description
      this.imgURL = String(toGatewayURL(metadata.image))
      this.loading = false
    },

    async mint() {
      // const lockWithSigner = this.lockContract.connect(this.$signer)
    },
  },
  mounted() {
    this.loadData()
  },
}
</script>