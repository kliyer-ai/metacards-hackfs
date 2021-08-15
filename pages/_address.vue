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

        <v-card-text>
          <p>Minted: {{ totalMinted }}/{{ this.totalSupply }}</p>
        </v-card-text>

        <v-card-actions>
          <v-btn v-if="hasValidKey" disabled
            >You already have a valid Metacard!</v-btn
          >
          <v-btn v-else-if="totalMinted < totalSupply" @click="mint">
            Buy / Mint for {{ price }}</v-btn
          >
          <v-btn v-else disabled>Sold out!</v-btn>
        </v-card-actions>
      </v-card>
    </v-col>

    <v-dialog v-model="dialog" width="300px">
      <v-card dark>
        <v-card-title>Minting... </v-card-title>
        <v-card-text>
          <h3 v-if="success">Success!</h3>
          <h3 v-else-if="error">There was an error...</h3>
          <v-progress-linear indeterminate v-else></v-progress-linear>
        </v-card-text>
        <v-card-actions v-if="success || error">
          <v-btn @click="dialog = false"> Close </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
      priceRaw: 0.0,
      price: '',
      totalSupply: 0,
      dialog: false,
      totalMinted: 0,
      hasValidKey: false,
      success: false,
      error: false,
    }
  },
  asyncData({ params, $provider }) {
    const contractAddress = params.address

    const lockContract = new ethers.Contract(
      contractAddress,
      abis.PublicLock.abi,
      $provider
    )

    return { contractAddress, lockContract }
  },
  methods: {
    async loadData() {
      this.loading = true

      const tokenURI = await this.lockContract.tokenURI(1)
      const url = toGatewayURL(tokenURI)
      const res = await fetch(url)
      const metadata = await res.json()

      this.priceRaw = await this.lockContract.keyPrice()
      this.price = ethers.utils.formatEther(this.priceRaw)
      this.totalSupply = await this.lockContract.maxNumberOfKeys()
      this.name = metadata.name
      this.description = metadata.description
      this.imgURL = String(toGatewayURL(metadata.image))

      const filter = this.lockContract.filters.Transfer(
        ethers.constants.AddressZero,
        null
      )
      const events = await this.lockContract.queryFilter(filter)
      this.totalMinted = events.length
      this.lockContract.on(filter, (from, to, amount, event) => {
        this.totalMinted++
      })

      this.hasValidKey = this.lockContract.getHasValidKey(
        this.$signer.getAddress()
      )

      this.loading = false
    },

    async mint() {
      this.dialog = true
      try {
        const signerAddress = this.$signer.getAddress()
        const lockWithSigner = this.lockContract.connect(this.$signer)
        const tx = await lockWithSigner.purchase(
          this.priceRaw, // price
          signerAddress, // recipient
          signerAddress, // referrer - same as recipient for now
          0, // data
          { value: this.priceRaw }
        )
        await tx.wait()
        this.hasValidKey = true
        this.success = true
      } catch (error) {
        this.error = true
      }
    },
  },
  mounted() {
    this.loadData()
  },
}
</script>