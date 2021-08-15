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
          <v-divider class="my-6"></v-divider>
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
          <v-text-field
            v-model="price"
            type="number"
            :label="`Price per card in ${chainId == 137 ? 'Matic' : 'Eth'}`"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="create"
            >Create Metacards on
            {{
              chainIdName[chainId] ? chainIdName[chainId] : 'Unknown'
            }}!</v-btn
          >
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
    <v-dialog v-model="loading" persistent width="500px">
      <v-card dark>
        <v-card-title>{{
          !error ? 'Creating your Metacard...' : 'There was an error...'
        }}</v-card-title>
        <v-card-text>
          <v-timeline dense>
            <v-slide-x-reverse-transition group hide-on-leave>
              <v-timeline-item
                v-for="task in tasks.slice(0, currentTask).reverse()"
                :key="task.id"
                fill-dot
                color="white"
              >
                <template v-slot:icon>
                  <v-icon v-if="error" color="red" dark large>
                    mdi-exclamation-thick
                  </v-icon>
                  <v-progress-circular
                    v-else-if="task.id == currentTask"
                    indeterminate
                    color="primary"
                  ></v-progress-circular>

                  <v-icon v-else dark large color="green">
                    mdi-check-bold
                  </v-icon>
                </template>
                {{ task.description }}
              </v-timeline-item>
            </v-slide-x-reverse-transition>
          </v-timeline>
        </v-card-text>
        <v-card-actions>
          <v-btn v-if="error" @click="loading = false"> Close </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="success" width="500px">
      <v-card dark>
        <v-card-title>Your cards were created!</v-card-title>
        <v-card-text>
          <v-btn :to="`/${newLockAddress}`" nuxt> Mint your cards here </v-btn>
          <div class="py-1"></div>
          <v-btn
            href="https://app.unlock-protocol.com/dashboard"
            target="_blanc"
          >
            View your cards on Unlock Protocol</v-btn
          >
        </v-card-text>
        <v-card-actions>
          <v-btn @click="success = false"> Close </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-row>
</template>

<script>
import { ethers } from 'ethers'
import html2canvas from 'html2canvas'
import { NFTStorage, File } from 'nft.storage'
import abis from '~/assets/abis'
import connectProvider from '~/services/provider'
import { unlockAddresses, chainIdName } from '~/assets/networks'

const Crypto = require('crypto')

const apiKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweEE5MzRCNGZiNTREOGFCMDk5NzY4NzU5YjU5OWYwYWI5Mjc3NGYyOUMiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTYyOTA0NzcyMzk0MSwibmFtZSI6ImFzZGZzYWYifQ.sFlkePbfV7ayYupL6JJER2utyQLY5UrSelHxWPHv7FM'
const client = new NFTStorage({ token: apiKey })

export default {
  data() {
    return {
      chainIdName,
      loading: false,
      success: false,
      input: null,
      upperTitle: '',
      lowerTitle: '',
      collectionName: '',
      collectionDescription: '',
      quantity: 1,
      price: 0.01,
      currentTask: 1,
      errorAtTask: 0,
      newLockAddress: '',
      provider: null,
      signer: null,
      chainId: 0,
      connected: false,
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
  middleware: 'ethDetected',
  computed: {
    error() {
      return this.currentTask === this.errorAtTask
    },
    image() {
      if (!this.input) return null
      return URL.createObjectURL(this.input)
    },
  },

  mounted() {
    this.connect()
  },

  methods: {
    async connect() {
      this.connected = false
      const { provider, signer, chainId, updateOnChainChange } =
        await connectProvider()
      this.provider = provider
      this.signer = signer
      this.chainId = chainId
      this.connected = true
      updateOnChainChange()
    },

    errorHandler(e) {
      this.errorAtTask = this.currentTask
    },

    async create() {
      this.loading = true

      const canvas = await html2canvas(document.querySelector('#capture'), {
        allowTaint: true,
      })

      canvas.toBlob(async (blob) => {
        try {
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
            unlockAddresses[this.chainId],
            abis.Unlock.abi,
            this.provider
          )
          const unlockWithSigner = unlockContract.connect(this.signer)
          const txCreateLock = await unlockWithSigner.createLock(
            31536000, // expiration duration in seconds - now it's a year
            '0x0000000000000000000000000000000000000000', // ERC20 token address - 0 for Ether
            ethers.utils.parseEther(String(this.price)), // price
            this.quantity, // number of keys
            this.collectionName, // name
            '0x' + Crypto.randomBytes(12).toString('hex') // user specific salt
          )
          const res = await txCreateLock.wait()
          const newLockAddress = res.events[0].args.newLockAddress
          this.newLockAddress = newLockAddress
          console.log(`new lock address ${newLockAddress}`)
          // ============================

          this.currentTask++

          // set base uri of lock ================
          const lockContract = new ethers.Contract(
            newLockAddress,
            abis.PublicLock.abi,
            this.provider
          )
          const lockWithSigner = lockContract.connect(this.signer)

          const txChangeURI = await lockWithSigner.setBaseTokenURI(
            `ipfs://${cidBaseURI}/`
          )
          console.log(txChangeURI)
          await txChangeURI.wait()
          // ===========================
          this.loading = false
          this.success = true
        } catch (error) {
          this.errorHandler(error)
        }
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