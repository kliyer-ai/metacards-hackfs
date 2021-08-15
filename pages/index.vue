<template>
  <v-row>
    <v-col cols="12" md="6">
      <v-card>
        <v-card-title> Information </v-card-title>
        <v-card-text>
          <v-file-input
            v-model="input"
            accept="image/*"
            label="Image input"
          ></v-file-input>
          <v-text-field v-model="upperTitle" label="Upper Title"></v-text-field>
          <v-text-field v-model="lowerTitle" label="Lower Title"></v-text-field>
          <v-text-field
            v-model="collectionName"
            label="Collection Name"
          ></v-text-field>
          <v-text-field
            v-model="collectionDescription"
            label="Collection Description"
          ></v-text-field>
          <v-text-field
            v-model="quantity"
            type="number"
            label="Quantity"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="create">Create Metacards!</v-btn>
        </v-card-actions>
      </v-card>
    </v-col>
    <v-col cols="12" md="6">
      <div id="capture" class="metacard-preview-container">
        <img class="preview-image" :src="image" />
        <div class="preview-upper-title">{{ upperTitle }}</div>
        <div class="preview-lower-title">{{ lowerTitle }}</div>
      </div>
    </v-col>
    <v-dialog v-model="loading" persistent width="300">
      <v-card color="primary" dark>
        <v-card-title>Creating your Metacard...</v-card-title>
        <v-card-text>
          <v-timeline dense>
            <v-slide-x-reverse-transition group hide-on-leave>
              <v-timeline-item
                v-for="task in tasks.slice(currentTask).reverse()"
                :key="task.id"
                color="blue"
                small
                fill-dot
              >
                {{ task.description }}
              </v-timeline-item>
            </v-slide-x-reverse-transition>
          </v-timeline>
          <v-progress-linear
            indeterminate
            color="white"
            class="mb-0"
          ></v-progress-linear>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-row>
</template>

<script>
import { ethers } from 'ethers'
import html2canvas from 'html2canvas'
import { NFTStorage, File } from 'nft.storage'
import abis from '~/assets/abis'

const Crypto = require('crypto')

const unlockAddress = '0xD8C88BE5e8EB88E38E6ff5cE186d764676012B0b'

const apiKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweEE5MzRCNGZiNTREOGFCMDk5NzY4NzU5YjU5OWYwYWI5Mjc3NGYyOUMiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTYyODg2MzI5NDA1NywibmFtZSI6ImhhY2tmcyJ9.tzwHSj34yAD_SIju7vqQ2uUgehp73kjNrFcH185ARYg'
const client = new NFTStorage({ token: apiKey })

export default {
  data() {
    return {
      loading: false,
      input: null,
      upperTitle: '',
      lowerTitle: '',
      collectionName: '',
      collectionDescription: '',
      quantity: 1,
      currentTask: 1,
      tasks: [
        {
          id: 1,
          description: 'Uploading your card to IPFS...',
        },
        {
          id: 2,
          description: 'Creating and uploading metadata...',
        },
        {
          id: 3,
          description: 'Creating your contract...',
        },
        {
          id: 4,
          description: 'Connecting contract to metadata...',
        },
      ],
    }
  },

  computed: {
    image() {
      if (!this.input) return null
      return URL.createObjectURL(this.input)
    },
  },

  methods: {
    async create() {
      this.loading = true
      const canvas = await html2canvas(document.querySelector('#capture'), {
        allowTaint: true,
      })

      canvas.toBlob(async (blob) => {
        // Upload image ============
        const cidImage = await client.storeBlob(blob)
        console.log(`image cid ${cidImage}`)

        // =========================

        this.currentTask++

        // Upload metadata ==============

        const fileList = []
        for (let i = 1; i <= this.quantity; i++) {
          const metadataFile = new File(
            [
              JSON.stringify({
                name: `${this.collectionName} #${i}`,
                description: this.description,
                image: `ipfs://${cidImage}`,
              }),
            ],
            String(i) // file name
          )
          fileList.push(metadataFile)
        }
        console.log(`file list ${fileList}`)
        const cidBaseURI = await client.storeDirectory(fileList)
        console.log(`base URI ${cidBaseURI}`)
        // =========================

        this.currentTask++

        // create lock ================
        const unlockContract = new ethers.Contract(
          unlockAddress,
          abis.Unlock.abi,
          this.$provider
        )
        const unlockWithSigner = unlockContract.connect(this.$signer)
        const txCreateLock = await unlockWithSigner.createLock(
          31536000, // expiration duration in seconds - now it's a year
          '0x0000000000000000000000000000000000000000', // ERC20 token address - 0 for Ether
          ethers.utils.parseEther('0.001'), // price
          this.quantity, // number of keys
          this.collectionName, // name
          '0x' + Crypto.randomBytes(12).toString('hex') // user specific salt
        )
        const res = await txCreateLock.wait()
        const newLockAddress = res.events[0].args.newLockAddress
        console.log(`new lock address ${newLockAddress}`)
        // ============================

        this.currentTask++

        // set base uri of lock ================
        const lockContract = new ethers.Contract(
          newLockAddress,
          abis.PublicLock.abi,
          this.$provider
        )
        const lockWithSigner = lockContract.connect(this.$signer)

        const txChangeURI = await lockWithSigner.setBaseTokenURI(
          `ipfs://${cidBaseURI}/`
        )
        console.log(txChangeURI)
        await txChangeURI.wait()
        // ===========================
        this.loading = false
      })
    },
  },
}
</script>

<style scoped>
.metacard-preview-container {
  position: absolute;
  margin-top: 2rem;
  background-image: url('/Green_screen_metacard.png');
  background-size: cover;
  background-color: white;
  border-radius: 1rem;
  width: 500px;
  height: 500px;
}

.preview-image {
  position: absolute;
  z-index: 2;
  left: 135px;
  top: 61px;
  border-radius: 10px;
  width: 230px;
  height: 390px;
}

.preview-upper-title {
  position: relative;
  left: 165px;
  top: 62px;
  font-weight: bold;
  z-index: 5;
  text-align: center;
  background-color: black;
  padding-top: 1px;
  color: silver;
  width: 170px;
  height: 23px;
  border-bottom: 4px solid silver;
  border-left: 4px solid silver;
  border-right: 4px solid silver;
  border-bottom-left-radius: 100px;
  border-bottom-right-radius: 100px;
}
.preview-lower-title {
  position: relative;
  left: 165px;
  top: 405px;
  z-index: 6;
  text-align: center;
  background-color: black;
  color: silver;
  width: 170px;
  height: 23px;
  border-top: 4px solid silver;
  border-left: 4px solid silver;
  border-right: 4px solid silver;
  border-top-left-radius: 100px;
  border-top-right-radius: 100px;
}
</style>